import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/toggl/start
 *
 * Phase 2 (2.4): tags must include [photographer] so Toggl entries are
 * auto-attributed to whichever photographer started the shoot, regardless of
 * which device made the call. The caller (TimerScreen) resolves the
 * photographer name from shoot.photographerId → PHOTOGRAPHERS → settings.userName
 * → 'Unknown' and passes it here. This route's only job is to forward it as
 * the sole tag on the Toggl time entry.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { description, photographer } = await request.json();
  const token = process.env.TOGGL_API_TOKEN;
  const workspaceId = process.env.TOGGL_WORKSPACE_ID;

  if (!token || !workspaceId) {
    console.log('[Toggl] Not configured — skipping');
    return NextResponse.json({ skipped: true });
  }

  const tags: string[] =
    typeof photographer === 'string' && photographer.length > 0
      ? [photographer]
      : [];

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
          tags,
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
