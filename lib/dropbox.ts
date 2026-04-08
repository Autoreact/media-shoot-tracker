/**
 * Dropbox API helper — Phase 3 of docs/specs/SHOOT_TRACKER_V2_HOTFIX_SPEC.md.
 *
 * Centralizes authentication, retry-on-400/401, full-body error logging, and
 * path sanitization so every Dropbox call goes through one code path that is
 * easy to reason about and unit-testable.
 *
 * Criteria covered here:
 *   - 3.1  sanitizeDropboxName strips /\<>:"|?* and collapses whitespace
 *   - 3.2  400/401 → refresh once → retry once → fail loudly
 *   - 3.3  token cache has an explicit TTL (3h); cold-start env tokens are
 *          treated as unknown-age and force a refresh on first use
 *   - 3.4  logDropboxError dumps status, error_summary, error['.tag']
 *   - 3.5  dropboxFetch(url, init) is the single helper every route uses
 */

/** Max age of a cached Dropbox access token before we force a refresh. */
export const TOKEN_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Sentinel meaning "token has unknown age" — used at cold start when we read
 * DROPBOX_ACCESS_TOKEN from env and don't know when it was issued.
 */
const UNKNOWN_ISSUED_AT = 0;

interface TokenCache {
  token: string | null;
  issuedAt: number;
}

const cache: TokenCache = {
  token: process.env.DROPBOX_ACCESS_TOKEN || null,
  issuedAt: process.env.DROPBOX_ACCESS_TOKEN ? UNKNOWN_ISSUED_AT : UNKNOWN_ISSUED_AT,
};

/** Sanitize a path segment for Dropbox. Criterion 3.1. */
export function sanitizeDropboxName(s: string): string {
  return s
    .replace(/[<>:"|?*\\/]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * POSTs to Dropbox's oauth2/token endpoint and updates the cache.
 * Returns the new token, or null if refresh fails / creds are missing.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (!refreshToken || !appKey || !appSecret) {
    console.error('[Dropbox] Missing refresh token or app credentials');
    return null;
  }

  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[Dropbox] Token refresh failed:', res.status, body);
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    console.error('[Dropbox] Token refresh response missing access_token');
    return null;
  }

  cache.token = data.access_token;
  cache.issuedAt = Date.now();
  console.log('[Dropbox] Token refreshed successfully');
  return cache.token;
}

/**
 * Return a valid access token, refreshing when:
 *   - the cache is empty, OR
 *   - the cached token is older than TOKEN_TTL_MS, OR
 *   - the cached token's age is unknown (cold start with env token).
 *
 * Criterion 3.3.
 */
export async function getAccessToken(): Promise<string | null> {
  const ageUnknown = cache.issuedAt === UNKNOWN_ISSUED_AT;
  const tooOld = !ageUnknown && Date.now() - cache.issuedAt > TOKEN_TTL_MS;

  if (!cache.token || ageUnknown || tooOld) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return refreshed;
    // Refresh failed: if we still have some token (e.g. env), return it as
    // a degraded fallback. Otherwise null.
    return cache.token;
  }

  return cache.token;
}

/**
 * Parse a Dropbox error response and emit a structured console.error that
 * always includes error_summary and error['.tag'] when available.
 * Criterion 3.4.
 */
export async function logDropboxError(
  context: string,
  res: Response,
): Promise<void> {
  let bodyText = '';
  try {
    bodyText = await res.clone().text();
  } catch {
    bodyText = '<unreadable>';
  }

  let errorSummary: string | undefined;
  let errorTag: string | undefined;
  try {
    const parsed = JSON.parse(bodyText) as {
      error_summary?: string;
      error?: { '.tag'?: string };
    };
    errorSummary = parsed.error_summary;
    errorTag = parsed.error?.['.tag'];
  } catch {
    // Not JSON — fall through to raw body logging only.
  }

  console.error(
    `[Dropbox] ${context} failed: status=${res.status}`,
    `error_summary=${errorSummary ?? 'n/a'}`,
    `error.tag=${errorTag ?? 'n/a'}`,
    `body=${bodyText}`,
  );
}

/**
 * Build the headers Dropbox expects for a write call:
 *  - Bearer auth with the caller-supplied token
 *  - JSON content type
 *  - Team root namespace pin (so folders land in the team /AutoHDR space
 *    instead of a personal member folder)
 */
function buildHeaders(token: string, extra?: HeadersInit): Record<string, string> {
  const rootNamespaceId = process.env.DROPBOX_ROOT_NAMESPACE_ID || '2618545747';
  const merged: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Dropbox-API-Path-Root': JSON.stringify({
      '.tag': 'root',
      root: rootNamespaceId,
    }),
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra as Record<string, string>)) {
      merged[k] = v;
    }
  }
  return merged;
}

/**
 * Single entry point for Dropbox API calls. Criterion 3.5.
 *
 *  - Injects Bearer + namespace headers.
 *  - On 400 or 401, refreshes the access token once and retries the call
 *    with the new token. Any other status (including 409 folder-exists)
 *    is returned as-is so callers can handle it.
 *  - Logs the full error body on every non-ok response via logDropboxError.
 */
export async function dropboxFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No Dropbox token available');
  }

  const firstInit: RequestInit = {
    ...init,
    method: init.method ?? 'POST',
    headers: buildHeaders(token, init.headers),
  };

  let res = await fetch(url, firstInit);

  if (res.status === 400 || res.status === 401) {
    console.warn(
      `[Dropbox] ${res.status} from ${url} — attempting token refresh + retry`,
    );
    await logDropboxError('dropboxFetch first attempt', res);

    const fresh = await refreshAccessToken();
    if (!fresh) {
      console.error('[Dropbox] Refresh failed during retry path');
      return res; // surface the original failure
    }

    const retryInit: RequestInit = {
      ...init,
      method: init.method ?? 'POST',
      headers: buildHeaders(fresh, init.headers),
    };
    res = await fetch(url, retryInit);

    if (!res.ok) {
      await logDropboxError('dropboxFetch retry attempt', res);
    }
  } else if (!res.ok) {
    await logDropboxError('dropboxFetch', res);
  }

  return res;
}

// --- Test-only helpers -----------------------------------------------------
// These are intentionally exported so unit tests can reset the in-module
// token cache between cases. They MUST NOT be called from production code.
/** @internal */
export function __resetDropboxCacheForTests(): void {
  cache.token = process.env.DROPBOX_ACCESS_TOKEN || null;
  cache.issuedAt = UNKNOWN_ISSUED_AT;
}

/** @internal */
export function __setTokenIssuedAtForTests(issuedAt: number): void {
  cache.issuedAt = issuedAt;
}
