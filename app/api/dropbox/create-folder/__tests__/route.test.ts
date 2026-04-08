/**
 * Phase 3 — Dropbox 400 resilience (route-level integration)
 * Spec: docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md §2 Phase 3 criteria 3.1, 3.2, 3.7, 3.8
 *
 * These tests mock lib/dropbox so they exercise the HTTP route plumbing
 * (validation, body shape, sanitization wiring, error propagation) without
 * touching the real Dropbox API.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../lib/dropbox', async () => {
  const actual = await vi.importActual<typeof import('../../../../../lib/dropbox')>(
    '../../../../../lib/dropbox',
  );
  return {
    ...actual,
    dropboxFetch: vi.fn(),
    getAccessToken: vi.fn().mockResolvedValue('test-token'),
    logDropboxError: vi.fn(),
  };
});

import * as dropboxLib from '../../../../../lib/dropbox';
import { POST } from '../route';

const mockDropboxFetch = vi.mocked(dropboxLib.dropboxFetch);

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/dropbox/create-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/dropbox/create-folder — route', () => {
  beforeEach(() => {
    process.env.DROPBOX_ACCESS_TOKEN = 'env';
    process.env.DROPBOX_REFRESH_TOKEN = 'refresh';
    process.env.DROPBOX_APP_KEY = 'key';
    process.env.DROPBOX_APP_SECRET = 'secret';
    mockDropboxFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 when orderNumber is missing', async () => {
    const req = makeRequest({ agentName: 'Jane', address: '123 Main St' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/orderNumber/i);
  });

  it('returns 400 when address is missing', async () => {
    const req = makeRequest({ orderNumber: 'A1', agentName: 'Jane' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/address/i);
  });

  it('creates folder and returns 200 on happy path', async () => {
    mockDropboxFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        metadata: { path_display: '/AutoHDR/A1 - Jane - 123 Main St/01-RAW-Photos' },
      }),
    );

    const req = makeRequest({
      orderNumber: 'A1',
      agentName: 'Jane',
      address: '123 Main St',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.dropboxUrl).toContain('https://www.dropbox.com/home/');
  });

  it('criterion 3.8 — "123 Main St / Apt 4" sanitizes to "123 Main St Apt 4" and returns 200', async () => {
    mockDropboxFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        metadata: {
          path_display: '/AutoHDR/A1 - Jane - 123 Main St Apt 4/01-RAW-Photos',
        },
      }),
    );

    const req = makeRequest({
      orderNumber: 'A1',
      agentName: 'Jane',
      address: '123 Main St / Apt 4',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);

    expect(res.status).toBe(200);

    // Route must have called dropboxFetch with the sanitized path in the body.
    expect(mockDropboxFetch).toHaveBeenCalledTimes(1);
    const call = mockDropboxFetch.mock.calls[0];
    if (!call) throw new Error('expected dropboxFetch call');
    const init = call[1];
    const bodyStr = (init as RequestInit).body as string;
    const parsed = JSON.parse(bodyStr);
    expect(parsed.path).toBe('/AutoHDR/A1 - Jane - 123 Main St Apt 4/01-RAW-Photos');
    // Must not contain the raw slash-in-address.
    expect(parsed.path).not.toMatch(/\/ Apt 4/);
  });

  it('returns 200 with existed:true on 409 (folder already exists)', async () => {
    mockDropboxFetch.mockResolvedValueOnce(
      jsonResponse(409, { error_summary: 'path/conflict/folder/' }),
    );

    const req = makeRequest({
      orderNumber: 'A1',
      agentName: 'Jane',
      address: '123 Main St',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.existed).toBe(true);
  });

  it('propagates non-409 failures and calls logDropboxError (criterion 3.4 wiring)', async () => {
    mockDropboxFetch.mockResolvedValueOnce(
      jsonResponse(500, { error_summary: 'internal/error/', error: { '.tag': 'other' } }),
    );

    const req = makeRequest({
      orderNumber: 'A1',
      agentName: 'Jane',
      address: '123 Main St',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);

    expect(res.status).toBe(500);
    expect(dropboxLib.logDropboxError).toHaveBeenCalled();
  });
});
