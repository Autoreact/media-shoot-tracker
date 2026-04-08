import { NextRequest, NextResponse } from 'next/server';

import {
  dropboxFetch,
  logDropboxError,
  sanitizeDropboxName,
} from '../../../../lib/dropbox';

/** Build Dropbox web URL from a path like /AutoHDR/folder/subfolder. */
function buildDropboxWebUrl(pathDisplay: string): string {
  const segments = pathDisplay.replace(/^\//, '').split('/');
  const encoded = segments.map(encodeURIComponent).join('/');
  return `https://www.dropbox.com/home/${encoded}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { orderNumber, agentName, address } = body;

    console.log('[Dropbox] Create folder request:', {
      orderNumber,
      agentName,
      address: address?.substring(0, 50),
    });

    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing orderNumber' }, { status: 400 });
    }

    if (!address) {
      console.error('[Dropbox] Missing address! Full body:', JSON.stringify(body));
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const folderName = `${orderNumber} - ${sanitizeDropboxName(agentName || 'Unknown')} - ${sanitizeDropboxName(address)}`;
    const folderPath = `/AutoHDR/${folderName}/01-RAW-Photos`;

    console.log('[Dropbox] Creating folder:', folderPath);

    // If no tokens at all, fail fast with a clear message.
    if (!process.env.DROPBOX_ACCESS_TOKEN && !process.env.DROPBOX_REFRESH_TOKEN) {
      console.error('[Dropbox] No tokens configured');
      return NextResponse.json(
        { error: 'No Dropbox tokens configured' },
        { status: 500 },
      );
    }

    const res = await dropboxFetch(
      'https://api.dropboxapi.com/2/files/create_folder_v2',
      {
        method: 'POST',
        body: JSON.stringify({ path: folderPath, autorename: false }),
      },
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
      // Folder already exists — still return the URL.
      const dropboxUrl = buildDropboxWebUrl(folderPath);
      console.log('[Dropbox] Folder already exists:', folderPath);

      return NextResponse.json({
        success: true,
        existed: true,
        path: folderPath,
        dropboxUrl,
      });
    }

    // dropboxFetch already logged the full body once, but call again with
    // the route-level context so ops can grep by endpoint name.
    await logDropboxError('create-folder route', res);

    const errText = await res.text();
    return NextResponse.json(
      { error: `Dropbox error: ${res.status}`, details: errText, path: folderPath },
      { status: res.status },
    );
  } catch (error) {
    console.error('[Dropbox] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
