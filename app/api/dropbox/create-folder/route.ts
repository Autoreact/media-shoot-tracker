import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

let cachedAccessToken = process.env.DROPBOX_ACCESS_TOKEN || '';
const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;

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

/** Create a Dropbox folder, auto-refreshing the token on 401 */
async function createFolder(folderPath: string): Promise<{ ok: boolean; status: number; existed?: boolean }> {
  const attempt = async (token: string): Promise<Response> =>
    fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: folderPath, autorename: false }),
    });

  let res = await attempt(cachedAccessToken);

  // Auto-refresh on 401
  if (res.status === 401) {
    console.log('[Dropbox] Token expired, refreshing...');
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await attempt(newToken);
    } else {
      return { ok: false, status: 401 };
    }
  }

  if (res.ok) return { ok: true, status: 200 };
  if (res.status === 409) return { ok: true, status: 409, existed: true };

  const errText = await res.text();
  console.error('[Dropbox] Create folder error:', res.status, errText);
  return { ok: false, status: res.status };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { orderNumber, agentName, address } = await request.json();

    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing orderNumber' }, { status: 400 });
    }

    // Sanitize folder name (remove chars Dropbox doesn't allow)
    const sanitize = (s: string): string =>
      s.replace(/[<>:"|?*\\]/g, '').replace(/\s+/g, ' ').trim();

    const folderName = `${orderNumber} - ${sanitize(agentName || 'Unknown')} - ${sanitize(address || 'No Address')}`;
    const folderPath = `/AutoHDR/${folderName}/01-RAW-Photos`;

    // Check if folder already exists in Supabase (dedup by order number)
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from('shoot_sessions')
      .select('dropbox_folder_created')
      .eq('aryeo_order_number', orderNumber)
      .single();

    if (existing?.dropbox_folder_created) {
      return NextResponse.json({
        success: true,
        message: 'Folder already created',
        path: folderPath,
      });
    }

    // If no tokens at all, log and return mock
    if (!cachedAccessToken && !DROPBOX_REFRESH_TOKEN) {
      console.log('[Dropbox] No token — would create:', folderPath);
      return NextResponse.json({ success: true, mock: true, path: folderPath });
    }

    // If access token is empty but we have refresh token, get a fresh one
    if (!cachedAccessToken && DROPBOX_REFRESH_TOKEN) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return NextResponse.json(
          { error: 'Could not refresh Dropbox token', path: folderPath },
          { status: 401 }
        );
      }
    }

    const result = await createFolder(folderPath);

    if (result.ok) {
      // Mark as created in Supabase
      await supabase
        .from('shoot_sessions')
        .update({ dropbox_folder_created: true })
        .eq('aryeo_order_number', orderNumber);

      return NextResponse.json({
        success: true,
        path: folderPath,
        existed: result.existed,
      });
    }

    return NextResponse.json(
      { error: 'Dropbox folder creation failed', path: folderPath },
      { status: result.status }
    );
  } catch (error) {
    console.error('[Dropbox] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
