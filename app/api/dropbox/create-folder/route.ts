import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

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

    // If no Dropbox token, log and return mock
    if (!DROPBOX_ACCESS_TOKEN) {
      console.log('[Dropbox] No token — would create:', folderPath);

      // Still mark as created in Supabase
      await supabase
        .from('shoot_sessions')
        .update({ dropbox_folder_created: true })
        .eq('aryeo_order_number', orderNumber);

      return NextResponse.json({
        success: true,
        mock: true,
        path: folderPath,
      });
    }

    // Create folder via Dropbox API
    // create_folder_v2 automatically creates parent folders (AutoHDR, order folder, etc.)
    const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: folderPath,
        autorename: false,
      }),
    });

    if (res.ok || res.status === 409) {
      // 409 = folder already exists, which is fine
      // Mark as created in Supabase
      await supabase
        .from('shoot_sessions')
        .update({ dropbox_folder_created: true })
        .eq('aryeo_order_number', orderNumber);

      return NextResponse.json({
        success: true,
        path: folderPath,
        existed: res.status === 409,
      });
    }

    // Handle expired/invalid token specifically
    if (res.status === 401) {
      console.error('[Dropbox] Token expired or invalid — needs refresh');
      return NextResponse.json(
        { error: 'Dropbox token expired', needsRefresh: true, path: folderPath },
        { status: 401 }
      );
    }

    const errText = await res.text();
    console.error('[Dropbox] Create folder error:', res.status, errText);
    return NextResponse.json(
      { error: 'Dropbox folder creation failed', path: folderPath },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Dropbox] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
