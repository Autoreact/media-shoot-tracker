import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { description, tags } = await request.json();
  const token = process.env.TOGGL_API_TOKEN;
  const workspaceId = process.env.TOGGL_WORKSPACE_ID;

  if (!token || !workspaceId) {
    console.log('[Toggl] Not configured — skipping');
    return NextResponse.json({ skipped: true });
  }

  try {
    const auth = Buffer.from(`${token}:api_token`).toString('base64');

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          created_with: '323 Media Shoot Tracker',
          description,
          tags: tags || [],
          workspace_id: parseInt(workspaceId),
          duration: -1, // -1 = running timer
          start: new Date().toISOString(),
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[Toggl] Start error:', res.status, err);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ id: data.id, start: data.start });
  } catch (error) {
    console.error('[Toggl] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
