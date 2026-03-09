import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { orderNumber, agentName, address } = await request.json();

    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing orderNumber' }, { status: 400 });
    }

    const folderName = `${orderNumber} - ${agentName || 'Unknown'} - ${address || 'No Address'}`;
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

    const errText = await res.text();
    console.error('[Dropbox] Create folder error:', errText);
    return NextResponse.json(
      { error: 'Dropbox folder creation failed' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Dropbox] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
