import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: shootId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'drone' | 'lot_line' | 'other'

    if (!file || !type) {
      return NextResponse.json(
        { error: 'Missing file or type' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Look up the session UUID from aryeo_order_number
    const { data: session } = await supabase
      .from('shoot_sessions')
      .select('id')
      .eq('aryeo_order_number', shootId)
      .single();

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `shoots/${shootId}/${type}/${Date.now()}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('shoot-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('shoot-attachments')
      .getPublicUrl(storagePath);

    // Insert attachment record (matching actual table schema)
    if (session?.id) {
      const { error: dbError } = await supabase
        .from('shoot_attachments')
        .insert({
          session_id: session.id,
          type,
          file_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
          metadata: {
            public_url: urlData.publicUrl,
          },
        });

      if (dbError) {
        console.error('DB insert error:', dbError);
        // File uploaded but DB record failed — still return success with path
      }
    }

    return NextResponse.json({
      path: storagePath,
      url: urlData.publicUrl,
      type,
    });
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
