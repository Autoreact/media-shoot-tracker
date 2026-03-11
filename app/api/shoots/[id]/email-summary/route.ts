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

    // Compute email data
    const variance = totals?.variance ?? 0;
    const varianceLabel = variance >= 0 ? `+${variance}` : `${variance}`;
    const varianceColor = variance >= 0 ? '#34C759' : '#FF3B30';
    const durationMin = Math.round((shoot.timerSeconds || 0) / 60);
    const durationStr =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
        : `${durationMin}m`;

    const completedRooms = (shoot.rooms || []).filter(
      (r: { completed: boolean; enabled: boolean }) => r.completed && r.enabled
    );
    const incompleteRooms = (shoot.rooms || []).filter(
      (r: { completed: boolean; enabled: boolean; skipped: boolean }) =>
        !r.completed && r.enabled && !r.skipped
    );
    const enabledRooms = (shoot.rooms || []).filter(
      (r: { enabled: boolean }) => r.enabled
    );

    const tierDisplayNames: Record<string, string> = {
      studio: 'Studio',
      two_two: '2/2',
      three_two: '3/2',
      four_three: '4/3',
      five_three: '5/3',
      five_four: '5/4',
      six_five: '6+/5+',
    };
    const tierDisplay = tierDisplayNames[shoot.tier] || shoot.tier;

    const photographerNames: Record<string, string> = {
      nick: 'Nick Renaud',
      jared: 'Jared Olsen',
      ben: 'Ben Harris',
    };
    const photographerName = photographerNames[shoot.photographerId] || shoot.photographerId || 'Unknown';

    const completionTime = shoot.completedAt
      ? new Date(shoot.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '';
    const completionDate = shoot.completedAt
      ? new Date(shoot.completedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const progressPercent = shoot.target > 0
      ? Math.round(((totals?.actualTotal ?? 0) / shoot.target) * 100)
      : 0;

    const subject = `Shoot Complete — ${shoot.address || 'No Address'}`;

    // Build room breakdown rows
    const roomBreakdownRows = enabledRooms
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => {
        const statusColor = r.completed ? '#34C759' : '#FF9500';
        const statusDot = r.completed ? '#34C759' : '#FF9500';
        const statusText = r.completed ? 'Done' : 'Incomplete';
        return `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F2F2F7; font-size: 14px; color: #1D1D1F;">
              ${r.name}
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #F2F2F7; font-size: 14px; color: #1D1D1F; text-align: center; font-variant-numeric: tabular-nums;">
              ${r.actualShots}/${r.expectedShots}
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #F2F2F7; text-align: right;">
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: ${statusColor}; font-weight: 500;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${statusDot};"></span>
                ${statusText}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    // Per-room notes
    const roomNotesSection = enabledRooms
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.notes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => `
        <tr>
          <td style="padding: 6px 0; font-size: 13px;">
            <span style="font-weight: 600; color: #1D1D1F;">${r.name}:</span>
            <span style="color: #86868B;"> ${r.notes}</span>
          </td>
        </tr>
      `)
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F7; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F5F5F7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 36px; height: 36px; background: #635BFF; border-radius: 10px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; line-height: 36px;">3</span>
                  </td>
                  <td style="padding-left: 10px;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 600; color: #1D1D1F; letter-spacing: -0.3px;">323 Media</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);">

                <!-- Header Section -->
                <tr>
                  <td style="padding: 32px 32px 24px;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 500; color: #86868B; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Shoot Complete
                    </p>
                    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 700; color: #1D1D1F; margin: 0 0 4px; letter-spacing: -0.5px; line-height: 1.2;">
                      ${shoot.address || 'No Address'}
                    </h1>
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #86868B; margin: 0;">
                      ${shoot.city ? `${shoot.city}, FL` : ''} ${completionDate ? `· ${completionDate}` : ''}
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding: 0 32px;"><div style="height: 1px; background: #F2F2F7;"></div></td></tr>

                <!-- Stats Grid -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Shots -->
                        <td width="33%" style="text-align: center; padding: 0 4px;">
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: #1D1D1F; margin: 0; letter-spacing: -1px; font-variant-numeric: tabular-nums;">
                            ${totals?.actualTotal ?? 0}
                          </p>
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; color: #86868B; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">
                            Shots
                          </p>
                        </td>
                        <!-- Target -->
                        <td width="33%" style="text-align: center; padding: 0 4px; border-left: 1px solid #F2F2F7; border-right: 1px solid #F2F2F7;">
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: #1D1D1F; margin: 0; letter-spacing: -1px; font-variant-numeric: tabular-nums;">
                            ${shoot.target}
                          </p>
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; color: #86868B; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">
                            Target
                          </p>
                        </td>
                        <!-- Variance -->
                        <td width="33%" style="text-align: center; padding: 0 4px;">
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; font-size: 32px; font-weight: 700; color: ${varianceColor}; margin: 0; letter-spacing: -1px; font-variant-numeric: tabular-nums;">
                            ${varianceLabel}
                          </p>
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; color: #86868B; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">
                            Variance
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding: 0 32px;"><div style="height: 1px; background: #F2F2F7;"></div></td></tr>

                <!-- Details Section -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B; width: 120px;">Order</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">#${shoot.aryeoOrderNumber || id}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Tier</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">${tierDisplay}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Photographer</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">${photographerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Agent</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">${shoot.agentName || '—'}</td>
                      </tr>
                      ${shoot.brokerage ? `
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Brokerage</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">${shoot.brokerage}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Duration</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">${durationStr}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Rooms</td>
                        <td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #1D1D1F; text-align: right;">${completedRooms.length} of ${enabledRooms.length} complete</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #86868B;">Progress</td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="font-size: 14px; font-weight: 600; color: ${progressPercent >= 100 ? '#34C759' : progressPercent >= 80 ? '#FF9500' : '#FF3B30'};">${progressPercent}%</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${incompleteRooms.length > 0 ? `
                <!-- Incomplete Rooms Alert -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #FFF9E6; border-radius: 12px; border: 1px solid #FFE4A0;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #B25000; margin: 0 0 6px;">
                            ${incompleteRooms.length} room${incompleteRooms.length !== 1 ? 's' : ''} incomplete
                          </p>
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #86868B; margin: 0; line-height: 1.5;">
                            ${incompleteRooms.map((r: { name: string }) => r.name).join(' · ')}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                <!-- Room Breakdown -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #86868B; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Room Breakdown
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 2px solid #F2F2F7; font-size: 11px; font-weight: 600; color: #86868B; text-transform: uppercase; letter-spacing: 0.5px;">Room</td>
                        <td style="padding: 8px 0; border-bottom: 2px solid #F2F2F7; font-size: 11px; font-weight: 600; color: #86868B; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">Shots</td>
                        <td style="padding: 8px 0; border-bottom: 2px solid #F2F2F7; font-size: 11px; font-weight: 600; color: #86868B; text-transform: uppercase; letter-spacing: 0.5px; text-align: right;">Status</td>
                      </tr>
                      ${roomBreakdownRows}
                    </table>
                  </td>
                </tr>

                ${shoot.dropboxFolderPath ? `
                <!-- Dropbox Folder -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F5F5F7; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: #86868B; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Dropbox Folder
                          </p>
                          <p style="font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; color: #1D1D1F; margin: 0; word-break: break-all; line-height: 1.5;">
                            ${shoot.dropboxFolderPath}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                ${roomNotesSection ? `
                <!-- Room Notes -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #86868B; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Room Notes
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;">
                      ${roomNotesSection}
                    </table>
                  </td>
                </tr>
                ` : ''}

                ${shoot.globalNotes ? `
                <!-- Global Notes -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F5F5F7; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: #86868B; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Notes
                          </p>
                          <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1D1D1F; margin: 0; line-height: 1.5;">
                            ${shoot.globalNotes}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                <!-- Bottom Padding -->
                <tr><td style="height: 8px;"></td></tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #86868B; margin: 0 0 4px;">
                Sent from 323 Media Shoot Tracker
              </p>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #AEAEB2; margin: 0;">
                ${completionDate}${completionTime ? ` at ${completionTime}` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
        from: '323 Media <onboarding@resend.dev>',
        to: ['nick@323media.io'],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Email] Resend error:', err);

      // If domain not verified, try with resend.dev domain
      if (err.includes('not verified') || err.includes('not authorized')) {
        const retryRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: '323 Media <onboarding@resend.dev>',
            to: ['nick@323media.io'],
            subject,
            html: htmlContent,
          }),
        });

        if (retryRes.ok) {
          return NextResponse.json({ success: true, fallbackDomain: true });
        }
      }

      return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Email] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
