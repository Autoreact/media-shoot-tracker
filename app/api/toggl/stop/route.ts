import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { timeEntryId } = await request.json();
  const token = process.env.TOGGL_API_TOKEN;
  const workspaceId = process.env.TOGGL_WORKSPACE_ID;

  if (!token || !workspaceId) {
    console.log('[Toggl] Not configured — skipping');
    return NextResponse.json({ skipped: true });
  }

  if (!timeEntryId) {
    return NextResponse.json({ error: 'Missing timeEntryId' }, { status: 400 });
  }

  try {
    const auth = Buffer.from(`${token}:api_token`).toString('base64');

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries/${timeEntryId}/stop`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[Toggl] Stop error:', res.status, err);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    // Phase 2 (2.5) — return start alongside duration and stop so callers
    // (CompletionScreen) can use the Toggl-authoritative timeline.
    return NextResponse.json({
      duration: data.duration,
      start: data.start,
      stop: data.stop,
    });
  } catch (error) {
    console.error('[Toggl] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
