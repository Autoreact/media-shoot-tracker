/**
 * Phase 3 — Dropbox 400 resilience
 * Spec: docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md §2 Phase 3 criteria 3.1–3.8
 *
 * Covers the pure + helper layer in lib/dropbox.ts:
 *   - sanitizeDropboxName (criterion 3.1, 3.8 pure)
 *   - dropboxFetch retry-on-400/401 (criteria 3.2, 3.5, 3.7)
 *   - getAccessToken TTL / cold-start refresh (criterion 3.3)
 *   - logDropboxError body-full logging (criterion 3.4)
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import {
  __resetDropboxCacheForTests,
  __setTokenIssuedAtForTests,
  dropboxFetch,
  getAccessToken,
  logDropboxError,
  sanitizeDropboxName,
  TOKEN_TTL_MS,
} from '../dropbox';

const REFRESH_URL = 'https://api.dropbox.com/oauth2/token';
const API_URL = 'https://api.dropboxapi.com/2/files/create_folder_v2';

/** Build a Response-like object with JSON body. */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Build a Response-like object with plain text body. */
function textResponse(status: number, body: string): Response {
  return new Response(body, { status });
}

describe('sanitizeDropboxName — criterion 3.1', () => {
  it('strips the full Dropbox-forbidden character set / \\ < > : " | ? *', () => {
    expect(sanitizeDropboxName('a/b\\c<d>e:f"g|h?i*j')).toBe('abcdefghij');
  });

  it('collapses runs of whitespace into a single space', () => {
    expect(sanitizeDropboxName('a   b\t\tc')).toBe('a b c');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeDropboxName('  hello world  ')).toBe('hello world');
  });

  it('criterion 3.8 — "123 Main St / Apt 4" sanitizes to "123 Main St Apt 4"', () => {
    expect(sanitizeDropboxName('123 Main St / Apt 4')).toBe('123 Main St Apt 4');
  });

  it('handles empty string without throwing', () => {
    expect(sanitizeDropboxName('')).toBe('');
  });
});

describe('getAccessToken — criterion 3.3 TTL + cold-start refresh', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.DROPBOX_ACCESS_TOKEN = 'env-token-stale';
    process.env.DROPBOX_REFRESH_TOKEN = 'refresh-123';
    process.env.DROPBOX_APP_KEY = 'key-abc';
    process.env.DROPBOX_APP_SECRET = 'secret-xyz';
    __resetDropboxCacheForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('force-refreshes on cold start (tokenIssuedAt is unknown)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { access_token: 'fresh-token-1' }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const token = await getAccessToken();

    expect(token).toBe('fresh-token-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(REFRESH_URL);
  });

  it('uses cached token within the 3h TTL window', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { access_token: 'fresh-token-2' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = await getAccessToken();
    const second = await getAccessToken();

    expect(first).toBe('fresh-token-2');
    expect(second).toBe('fresh-token-2');
    // Only the cold-start refresh should have called fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes again once the cached token is older than 3h', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-A' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-B' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = await getAccessToken();
    // Rewind the cache clock past the TTL.
    __setTokenIssuedAtForTests(Date.now() - (TOKEN_TTL_MS + 1));
    const second = await getAccessToken();

    expect(first).toBe('fresh-A');
    expect(second).toBe('fresh-B');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null if no refresh credentials are available', async () => {
    delete process.env.DROPBOX_REFRESH_TOKEN;
    delete process.env.DROPBOX_ACCESS_TOKEN;
    __resetDropboxCacheForTests();

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const token = await getAccessToken();

    expect(token).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('dropboxFetch — criteria 3.2, 3.5 (path/init helper) + 3.7 retry-on-400', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.DROPBOX_ACCESS_TOKEN = 'stale-env';
    process.env.DROPBOX_REFRESH_TOKEN = 'refresh-123';
    process.env.DROPBOX_APP_KEY = 'key-abc';
    process.env.DROPBOX_APP_SECRET = 'secret-xyz';
    process.env.DROPBOX_ROOT_NAMESPACE_ID = '2618545747';
    __resetDropboxCacheForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('takes (url, init) and injects Bearer + namespace headers', async () => {
    const fetchMock = vi
      .fn()
      // cold-start refresh
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-1' }))
      // API call
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await dropboxFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ path: '/AutoHDR/x', autorename: false }),
    });

    expect(res.status).toBe(200);
    // Second call is the API invocation.
    const secondCall = fetchMock.mock.calls[1];
    if (!secondCall) throw new Error('expected API call');
    const init = secondCall[1];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer fresh-1');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Dropbox-API-Path-Root']).toContain('2618545747');
  });

  it('criterion 3.7 — 400 triggers refresh then retries once and succeeds', async () => {
    const fetchMock = vi
      .fn()
      // cold-start refresh
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-old' }))
      // first API attempt — stale token 400
      .mockResolvedValueOnce(
        jsonResponse(400, {
          error_summary: 'expired_access_token/',
          error: { '.tag': 'expired_access_token' },
        }),
      )
      // retry refresh
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-new' }))
      // retry API attempt — success
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await dropboxFetch(API_URL, { method: 'POST', body: '{}' });

    expect(res.status).toBe(200);
    // 4 calls: cold-start refresh, first API, retry refresh, retry API.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    // The retry API call must carry the NEW token.
    const retryCall = fetchMock.mock.calls[3];
    if (!retryCall) throw new Error('expected retry call');
    const retryInit = retryCall[1] as RequestInit;
    const retryHeaders = retryInit.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer fresh-new');
  });

  it('criterion 3.2 — 401 also triggers refresh-and-retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-old' }))
      .mockResolvedValueOnce(
        jsonResponse(401, { error_summary: 'invalid_access_token/' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-new' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await dropboxFetch(API_URL, { method: 'POST', body: '{}' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('retries at most once — second failure is returned as-is', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-old' }))
      .mockResolvedValueOnce(
        jsonResponse(400, {
          error_summary: 'expired_access_token/',
          error: { '.tag': 'expired_access_token' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh-new' }))
      .mockResolvedValueOnce(
        jsonResponse(400, {
          error_summary: 'expired_access_token/',
          error: { '.tag': 'expired_access_token' },
        }),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await dropboxFetch(API_URL, { method: 'POST', body: '{}' });
    expect(res.status).toBe(400);
    // Only one retry: 4 calls total.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does NOT retry on 409 (folder already exists)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'fresh' }))
      .mockResolvedValueOnce(
        jsonResponse(409, { error_summary: 'path/conflict/' }),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await dropboxFetch(API_URL, { method: 'POST', body: '{}' });
    expect(res.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('logDropboxError — criterion 3.4 full body with error_summary + .tag', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs error_summary and error[".tag"] when body is JSON', async () => {
    const res = jsonResponse(400, {
      error_summary: 'path/malformed_path/',
      error: { '.tag': 'path', path: { '.tag': 'malformed_path' } },
    });

    await logDropboxError('create-folder', res);

    const logged = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain('create-folder');
    expect(logged).toContain('400');
    expect(logged).toContain('path/malformed_path');
    expect(logged).toContain('malformed_path');
  });

  it('falls back to raw text body when body is not JSON', async () => {
    const res = textResponse(500, 'Internal Server Error — not JSON');

    await logDropboxError('create-folder', res);

    const logged = errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain('500');
    expect(logged).toContain('Internal Server Error');
  });
});
