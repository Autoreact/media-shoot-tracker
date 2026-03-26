import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const f = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const fd = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const fm = `'SF Mono', SFMono-Regular, Menlo, Consolas, monospace`;

/** Escape HTML special characters to prevent injection in email templates */
function esc(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const body = await request.json();
    const { shoot, totals, attachmentUrls } = body;

    if (!shoot) {
      return NextResponse.json(
        { error: 'Missing shoot data' },
        { status: 400 }
      );
    }

    const variance = totals?.variance ?? 0;
    const varianceLabel = variance >= 0 ? `+${variance}` : `${variance}`;
    const varianceColor = variance >= 0 ? '#30D158' : '#FF453A';
    const durationMin = Math.round((shoot.timerSeconds || 0) / 60);
    const durationStr =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
        : `${durationMin}m`;

    const enabledRooms = (shoot.rooms || []).filter(
      (r: { enabled: boolean }) => r.enabled
    );
    const completedRooms = enabledRooms.filter(
      (r: { completed: boolean }) => r.completed
    );
    const incompleteRooms = enabledRooms.filter(
      (r: { completed: boolean; skipped: boolean }) =>
        !r.completed && !r.skipped
    );

    const tierMap: Record<string, string> = {
      studio: 'Studio',
      two_two: '2/2',
      three_two: '3/2',
      four_three: '4/3',
      five_three: '5/3',
      five_four: '5/4',
      six_five: '6+/5+',
    };
    const tierDisplay = tierMap[shoot.tier] || shoot.tier;

    const nameMap: Record<string, string> = {
      nick: 'Nick Renaud',
      jared: 'Jared Olsen',
      ben: 'Ben Harris',
    };
    const photographer =
      nameMap[shoot.photographerId] || shoot.photographerId || 'Unknown';

    const completionTime = shoot.completedAt
      ? new Date(shoot.completedAt).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : '';
    const completionDate = shoot.completedAt
      ? new Date(shoot.completedAt).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

    const pct =
      shoot.target > 0
        ? Math.round(((totals?.actualTotal ?? 0) / shoot.target) * 100)
        : 0;
    const pctColor = pct >= 100 ? '#30D158' : pct >= 80 ? '#FF9F0A' : '#FF453A';

    const subject = `Shoot Complete — ${shoot.address || 'No Address'} — #${shoot.aryeoOrderNumber || id}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roomRows = enabledRooms
      .map((r: any, i: number) => {
        const done = r.completed;
        const isLast = i === enabledRooms.length - 1;
        return `<tr>
        <td style="padding: 10px 0; ${isLast ? '' : 'border-bottom: 1px solid #F2F2F7;'} font-size: 13px; color: #1D1D1F; font-family: ${f};">${esc(r.name)}</td>
        <td style="padding: 10px 0; ${isLast ? '' : 'border-bottom: 1px solid #F2F2F7;'} font-size: 13px; color: #48484A; text-align: center; font-variant-numeric: tabular-nums; font-family: ${fm};">${r.actualShots}/${r.expectedShots}</td>
        <td style="padding: 10px 0; ${isLast ? '' : 'border-bottom: 1px solid #F2F2F7;'} text-align: right; font-family: ${f}; width: 32px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${done ? '#30D158' : '#FF9F0A'};"></span>
        </td>
      </tr>`;
      })
      .join('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noteRows = enabledRooms
      .filter((r: any) => r.notes)
      .map(
        (r: any) => `
      <tr><td style="padding: 6px 0; font-family: ${f}; font-size: 13px; line-height: 1.5;">
        <span style="color: #1D1D1F; font-weight: 600;">${esc(r.name)}</span>
        <span style="color: #8E8E93;"> — ${esc(r.notes)}</span>
      </td></tr>`
      )
      .join('');

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #8E8E93; font-family: ${f};">${label}</td>
        <td style="padding: 8px 0; font-size: 13px; font-weight: 500; color: #1D1D1F; text-align: right; font-family: ${f};">${value}</td>
      </tr>`;

    const hasAttachments = attachmentUrls && attachmentUrls.length > 0;
    const attachRows = hasAttachments
      ? attachmentUrls
          .map((a: { url: string; name: string; type: string }, i: number) => {
            const dotColor = a.type === 'drone' ? '#635BFF' : '#FF9F0A';
            const typeLabel = a.type === 'drone' ? 'Drone' : 'Lot Line';
            const isLast = i === attachmentUrls.length - 1;
            return `<tr>
            <td style="padding: 10px 16px; ${isLast ? '' : 'border-bottom: 1px solid #F2F2F7;'} font-family: ${f};">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="width: 28px; vertical-align: middle;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor};"></div>
                </td>
                <td style="vertical-align: middle;">
                  <a href="${esc(a.url)}" style="font-size: 13px; color: #635BFF; text-decoration: none; font-weight: 500;">${esc(a.name)}</a>
                  <span style="font-size: 11px; color: #C7C7CC; margin-left: 6px;">${typeLabel}</span>
                </td>
              </tr></table>
            </td>
          </tr>`;
          })
          .join('')
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #F2F2F7; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F2F2F7;">
<tr><td align="center" style="padding: 40px 16px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="520" style="max-width: 520px; width: 100%;">

  <!-- Logo -->
  <tr><td align="center" style="padding-bottom: 32px;">
    <table role="presentation"><tr>
      <td style="width: 28px; height: 28px; background: #635BFF; border-radius: 7px; text-align: center; vertical-align: middle;">
        <span style="color: #fff; font-family: ${fd}; font-size: 14px; font-weight: 700; line-height: 28px;">3</span>
      </td>
      <td style="padding-left: 8px;">
        <span style="font-family: ${fd}; font-size: 15px; font-weight: 600; color: #1D1D1F; letter-spacing: -0.2px;">323 Media</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- Card -->
  <tr><td>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #fff; border-radius: 20px; overflow: hidden;">

    <!-- Hero -->
    <tr><td style="padding: 32px 28px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td>
          <p style="font-family: ${f}; font-size: 11px; font-weight: 600; color: #30D158; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Shoot Complete</p>
          <h1 style="font-family: ${fd}; font-size: 28px; font-weight: 700; color: #1D1D1F; margin: 0; letter-spacing: -0.5px; line-height: 1.15;">${esc(shoot.address) || 'No Address'}</h1>
          <p style="font-family: ${f}; font-size: 14px; color: #8E8E93; margin: 6px 0 0; line-height: 1.4;">${[shoot.city ? `${esc(shoot.city)}, FL` : '', completionDate].filter(Boolean).join(' · ')}</p>
        </td>
        <td width="64" style="vertical-align: top; text-align: right;">
          <div style="width: 48px; height: 48px; background: ${pct >= 100 ? '#30D158' : '#F2F2F7'}; border-radius: 50%; text-align: center; line-height: 48px; margin-left: auto;">
            <span style="font-family: ${fd}; font-size: 14px; font-weight: 700; color: ${pct >= 100 ? '#fff' : pctColor};">${pct}%</span>
          </div>
        </td>
      </tr></table>
    </td></tr>

    <!-- Stats -->
    <tr><td style="padding: 28px 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F9F9FB; border-radius: 14px;">
        <tr>
          <td width="33%" style="text-align: center; padding: 20px 8px;">
            <p style="font-family: ${fd}; font-size: 36px; font-weight: 700; color: #1D1D1F; margin: 0; letter-spacing: -1.5px; font-variant-numeric: tabular-nums; line-height: 1;">${totals?.actualTotal ?? 0}</p>
            <p style="font-family: ${f}; font-size: 10px; font-weight: 600; color: #AEAEB2; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 0.8px;">Shots</p>
          </td>
          <td width="33%" style="text-align: center; padding: 20px 8px; border-left: 1px solid #E5E5EA; border-right: 1px solid #E5E5EA;">
            <p style="font-family: ${fd}; font-size: 36px; font-weight: 700; color: #1D1D1F; margin: 0; letter-spacing: -1.5px; font-variant-numeric: tabular-nums; line-height: 1;">${shoot.target}</p>
            <p style="font-family: ${f}; font-size: 10px; font-weight: 600; color: #AEAEB2; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 0.8px;">Target</p>
          </td>
          <td width="33%" style="text-align: center; padding: 20px 8px;">
            <p style="font-family: ${fd}; font-size: 36px; font-weight: 700; color: ${varianceColor}; margin: 0; letter-spacing: -1.5px; font-variant-numeric: tabular-nums; line-height: 1;">${varianceLabel}</p>
            <p style="font-family: ${f}; font-size: 10px; font-weight: 600; color: #AEAEB2; margin: 8px 0 0; text-transform: uppercase; letter-spacing: 0.8px;">Variance</p>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Details -->
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${row('Order', `#${shoot.aryeoOrderNumber || id}`)}
        ${row('Tier', tierDisplay)}
        ${row('Photographer', photographer)}
        ${row('Agent', esc(shoot.agentName) || '—')}
        ${shoot.brokerage ? row('Brokerage', esc(shoot.brokerage)) : ''}
        ${row('Duration', durationStr)}
        ${row('Rooms', `${completedRooms.length} of ${enabledRooms.length}`)}
      </table>
    </td></tr>

    ${
      incompleteRooms.length > 0
        ? `
    <!-- Alert -->
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #FFF8E1; border-radius: 12px;">
        <tr><td style="padding: 14px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align: top; padding-right: 10px;">
              <div style="width: 20px; height: 20px; background: #FF9F0A; border-radius: 50%; text-align: center; line-height: 20px;">
                <span style="color: #fff; font-family: ${fd}; font-size: 13px; font-weight: 700;">!</span>
              </div>
            </td>
            <td>
              <p style="font-family: ${f}; font-size: 13px; font-weight: 600; color: #1D1D1F; margin: 0 0 3px;">${incompleteRooms.length} room${incompleteRooms.length !== 1 ? 's' : ''} incomplete</p>
              <p style="font-family: ${f}; font-size: 12px; color: #8E8E93; margin: 0; line-height: 1.5;">${incompleteRooms.map((r: { name: string }) => esc(r.name)).join('  ·  ')}</p>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
    `
        : ''
    }

    <!-- Rooms -->
    <tr><td style="padding: 0 28px 12px;">
      <p style="font-family: ${f}; font-size: 11px; font-weight: 600; color: #AEAEB2; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Room Breakdown</p>
    </td></tr>
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 0 0 8px; font-size: 10px; font-weight: 600; color: #C7C7CC; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${f};">Room</td>
          <td style="padding: 0 0 8px; font-size: 10px; font-weight: 600; color: #C7C7CC; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; font-family: ${f};">Shots</td>
          <td style="padding: 0 0 8px; width: 32px;"></td>
        </tr>
        ${roomRows}
      </table>
    </td></tr>

    ${
      shoot.dropboxFolderPath
        ? `
    <!-- Dropbox -->
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F5F3FF; border-radius: 12px;">
        <tr><td style="padding: 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align: top; padding-right: 12px;">
              <div style="width: 32px; height: 32px; background: #EDE9FE; border-radius: 8px; text-align: center; line-height: 32px;">
                <span style="font-size: 16px; color: #635BFF;">&#8599;</span>
              </div>
            </td>
            <td>
              <p style="font-family: ${f}; font-size: 11px; font-weight: 600; color: #8E8E93; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.8px;">Dropbox Folder</p>
              <a href="${esc(shoot.dropboxUrl || `https://www.dropbox.com/home/${encodeURIComponent(shoot.dropboxFolderPath)}`)}" style="font-family: ${fm}; font-size: 11px; color: #635BFF; word-break: break-all; line-height: 1.5; text-decoration: none;">${esc(shoot.dropboxFolderPath)}</a>
            </td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
    `
        : ''
    }

    ${
      hasAttachments
        ? `
    <!-- Attachments -->
    <tr><td style="padding: 0 28px 12px;">
      <p style="font-family: ${f}; font-size: 11px; font-weight: 600; color: #AEAEB2; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Attachments</p>
    </td></tr>
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F9F9FB; border-radius: 12px;">
        ${attachRows}
      </table>
    </td></tr>
    `
        : ''
    }

    ${
      noteRows
        ? `
    <!-- Room Notes -->
    <tr><td style="padding: 0 28px 12px;">
      <p style="font-family: ${f}; font-size: 11px; font-weight: 600; color: #AEAEB2; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Room Notes</p>
    </td></tr>
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${noteRows}
      </table>
    </td></tr>
    `
        : ''
    }

    ${
      shoot.globalNotes
        ? `
    <!-- Notes -->
    <tr><td style="padding: 0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #F9F9FB; border-radius: 12px;">
        <tr><td style="padding: 16px;">
          <p style="font-family: ${f}; font-size: 11px; font-weight: 600; color: #AEAEB2; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.8px;">Notes</p>
          <p style="font-family: ${f}; font-size: 13px; color: #1D1D1F; margin: 0; line-height: 1.6;">${esc(shoot.globalNotes)}</p>
        </td></tr>
      </table>
    </td></tr>
    `
        : ''
    }

    <tr><td style="height: 4px;"></td></tr>

  </table>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding: 24px 16px 8px;">
    <p style="font-family: ${f}; font-size: 11px; color: #AEAEB2; margin: 0; line-height: 1.6;">${completionDate}${completionTime ? ` at ${completionTime}` : ''}</p>
    <p style="font-family: ${f}; font-size: 11px; color: #C7C7CC; margin: 4px 0 0;">323 Media Shoot Tracker</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

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
        html,
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
