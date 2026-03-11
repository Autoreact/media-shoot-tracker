import { NextRequest, NextResponse } from 'next/server';

let cachedAccessToken = process.env.DROPBOX_ACCESS_TOKEN || '';
const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
// Team root namespace — ensures folders go to team-level /AutoHDR/ not personal space
const DROPBOX_ROOT_NAMESPACE_ID = process.env.DROPBOX_ROOT_NAMESPACE_ID || '2618545747';

/** Refresh the Dropbox access token using the refresh token */
async function refreshAccessToken(): Promise<string | null> {
  if (!DROPBOX_REFRESH_TOKEN || !DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    console.error('[Dropbox] Missing refresh token or app credentials');
    return null;
  }

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: DROPBOX_REFRESH_TOKEN,
      client_id: DROPBOX_APP_KEY,
      client_secret: DROPBOX_APP_SECRET,
    }),
  });

  if (!res.ok) {
    console.error('[Dropbox] Token refresh failed:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  console.log('[Dropbox] Token refreshed successfully');
  return cachedAccessToken;
}

/** Ensure we have a valid access token */
async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken) return cachedAccessToken;
  if (DROPBOX_REFRESH_TOKEN) return refreshAccessToken();
  return null;
}

/** Make Dropbox API call with auto-refresh on 401, targeting team root namespace */
async function dropboxFetch(url: string, body: Record<string, unknown>): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('No Dropbox token available');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Dropbox-API-Path-Root': JSON.stringify({ '.tag': 'root', root: DROPBOX_ROOT_NAMESPACE_ID }),
  };

  let res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    console.log('[Dropbox] Token expired, refreshing...');
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error('Token refresh failed');

    headers.Authorization = `Bearer ${newToken}`;
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  return res;
}

/** Build Dropbox web URL from a path like /AutoHDR/folder/subfolder */
function buildDropboxWebUrl(pathDisplay: string): string {
  // Remove leading slash, encode each segment
  const segments = pathDisplay.replace(/^\//, '').split('/');
  const encoded = segments.map(encodeURIComponent).join('/');
  return `https://www.dropbox.com/home/${encoded}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { orderNumber, agentName, address } = body;

    console.log('[Dropbox] Create folder request:', { orderNumber, agentName, address: address?.substring(0, 50) });

    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing orderNumber' }, { status: 400 });
    }

    if (!address) {
      console.error('[Dropbox] Missing address! Full body:', JSON.stringify(body));
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    // Sanitize folder name (remove chars Dropbox doesn't allow)
    const sanitize = (s: string): string =>
      s.replace(/[<>:"|?*\\]/g, '').replace(/\s+/g, ' ').trim();

    const folderName = `${orderNumber} - ${sanitize(agentName || 'Unknown')} - ${sanitize(address)}`;
    const folderPath = `/AutoHDR/${folderName}/01-RAW-Photos`;

    console.log('[Dropbox] Creating folder:', folderPath);

    // If no tokens at all, return error
    if (!cachedAccessToken && !DROPBOX_REFRESH_TOKEN) {
      console.error('[Dropbox] No tokens configured');
      return NextResponse.json({ error: 'No Dropbox tokens configured' }, { status: 500 });
    }

    // Create folder via Dropbox API
    const res = await dropboxFetch(
      'https://api.dropboxapi.com/2/files/create_folder_v2',
      { path: folderPath, autorename: false }
    );

    if (res.ok) {
      const data = await res.json();
      const pathDisplay = data.metadata?.path_display || folderPath;
      const dropboxUrl = buildDropboxWebUrl(pathDisplay);

      console.log('[Dropbox] Folder created:', pathDisplay);
      console.log('[Dropbox] Web URL:', dropboxUrl);

      return NextResponse.json({
        success: true,
        path: pathDisplay,
        folderPath: `/AutoHDR/${folderName}`,
        rawPhotosFolderPath: pathDisplay,
        dropboxUrl,
      });
    }

    if (res.status === 409) {
      // Folder already exists — still return the URL
      const dropboxUrl = buildDropboxWebUrl(folderPath);
      console.log('[Dropbox] Folder already exists:', folderPath);

      return NextResponse.json({
        success: true,
        existed: true,
        path: folderPath,
        dropboxUrl,
      });
    }

    const errText = await res.text();
    console.error('[Dropbox] Create folder error:', res.status, errText);
    return NextResponse.json(
      { error: `Dropbox error: ${res.status}`, details: errText, path: folderPath },
      { status: res.status }
    );
  } catch (error) {
    console.error('[Dropbox] Error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
