import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const { timeEntryId, duration, description, tags } = await request.json();
  const token = process.env.TOGGL_API_TOKEN;
  const workspaceId = process.env.TOGGL_WORKSPACE_ID;

  if (!token || !workspaceId) {
    return NextResponse.json({ skipped: true });
  }

  if (!timeEntryId) {
    return NextResponse.json({ error: 'Missing timeEntryId' }, { status: 400 });
  }

  try {
    const auth = Buffer.from(`${token}:api_token`).toString('base64');

    // Build update payload — only include fields that were provided
    const body: Record<string, unknown> = {};
    if (duration !== undefined) body.duration = duration;
    if (description !== undefined) body.description = description;
    if (tags !== undefined) body.tags = tags;

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${workspaceId}/time_entries/${timeEntryId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[Toggl] Update error:', res.status, err);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ duration: data.duration, id: data.id });
  } catch (error) {
    console.error('[Toggl] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
