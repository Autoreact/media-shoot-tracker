import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const body = await request.json();
    const { shoot, totals } = body;

    if (!shoot) {
      return NextResponse.json({ error: 'Missing shoot data' }, { status: 400 });
    }

    // Build email content
    const variance = totals?.variance ?? 0;
    const varianceLabel = variance >= 0 ? `+${variance}` : `${variance}`;
    const durationMin = Math.round((shoot.timerSeconds || 0) / 60);
    const durationStr =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
        : `${durationMin}m`;

    const completedRooms = (shoot.rooms || []).filter(
      (r: { completed: boolean; enabled: boolean }) => r.completed && r.enabled
    );
    const skippedRooms = (shoot.rooms || []).filter(
      (r: { completed: boolean; enabled: boolean; skipped: boolean }) =>
        !r.completed && r.enabled && !r.skipped
    );

    const subject = `Shoot Complete: ${shoot.tier} — ${shoot.address || 'No Address'}`;

    const htmlContent = `
      <div style="font-family: Inter, -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #635BFF; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; font-size: 18px; margin: 0;">Shoot Complete</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">${shoot.address || 'No Address'}</p>
        </div>
        <div style="background: white; padding: 20px; border: 1px solid #E3E8EF; border-top: 0;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Order #</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">${shoot.aryeoOrderNumber || id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Tier</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">${shoot.tier}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Photographer</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">${shoot.photographerId || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Agent</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">${shoot.agentName || '—'}</td>
            </tr>
            <tr style="border-top: 1px solid #E3E8EF;">
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Shots</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 15px;">${totals?.actualTotal ?? 0} / ${shoot.target}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Variance</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 15px; color: ${variance >= 0 ? '#00D924' : '#DF1B41'};">${varianceLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Duration</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">${durationStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #616E7C; font-size: 13px;">Rooms Done</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 13px;">${completedRooms.length} / ${totals?.totalCount ?? 0}</td>
            </tr>
          </table>

          ${skippedRooms.length > 0 ? `
          <div style="background: #FFF9E6; border: 1px solid #FFEDAA; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <p style="font-size: 12px; font-weight: 600; color: #D99E00; margin: 0 0 4px;">Incomplete Rooms</p>
            <p style="font-size: 12px; color: #616E7C; margin: 0;">
              ${skippedRooms.map((r: { name: string }) => r.name).join(', ')}
            </p>
          </div>
          ` : ''}

          ${shoot.dropboxFolderPath ? `
          <div style="background: #F6F9FC; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <p style="font-size: 11px; font-weight: 600; color: #3E4C59; margin: 0 0 4px;">Dropbox Folder</p>
            <p style="font-size: 11px; color: #616E7C; font-family: monospace; margin: 0; word-break: break-all;">${shoot.dropboxFolderPath}</p>
          </div>
          ` : ''}

          ${shoot.globalNotes ? `
          <div style="margin-bottom: 16px;">
            <p style="font-size: 12px; font-weight: 600; color: #3E4C59; margin: 0 0 4px;">Notes</p>
            <p style="font-size: 12px; color: #616E7C; margin: 0;">${shoot.globalNotes}</p>
          </div>
          ` : ''}
        </div>
        <div style="background: #F6F9FC; padding: 12px 20px; border-radius: 0 0 12px 12px; border: 1px solid #E3E8EF; border-top: 0;">
          <p style="font-size: 10px; color: #9AA5B1; margin: 0; text-align: center;">323 Media Shoot Tracker</p>
        </div>
      </div>
    `;

    // Send via Resend if API key available
    if (!RESEND_API_KEY) {
      console.log('[Email] No RESEND_API_KEY — would send:', subject);
      return NextResponse.json({ success: true, mock: true });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: '323 Media <noreply@323media.io>',
        to: ['nick@323media.io'],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Email] Resend error:', err);
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Email] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
