import { Resend } from 'resend';

export interface CriticalAsteroidSummary {
  id: string;
  name: string;
  torinoScale: number;
  risk: number;
  isPHA: boolean;
  size: number; // meters (max est diameter)
  velocity: number; // km/s
  missDistance: number; // AU
  closeApproachDate?: string;
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendCriticalAsteroidsEmail(params: {
  to: string;
  subject?: string;
  asteroids: CriticalAsteroidSummary[];
}): Promise<{ id?: string; error?: string } | null> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set; skipping email send.');
    return null;
  }

  const from = process.env.ALERT_FROM_EMAIL || 'onboarding@resend.dev';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const subject = params.subject || `AstroWatch: ${params.asteroids.length} critical asteroid(s) detected`;

  const rows = params.asteroids
    .map(a => `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee">${a.name}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${a.torinoScale}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${a.risk.toFixed(2)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${a.isPHA ? 'Yes' : 'No'}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee">${a.size >= 1000 ? (a.size/1000).toFixed(2)+' km' : a.size.toFixed(0)+' m'}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee">${a.velocity.toFixed(1)} km/s</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee">${a.missDistance.toFixed(3)} AU</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee">${a.closeApproachDate || '-'}</td>
      </tr>
    `)
    .join('');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;">
      <h2>AstroWatch Critical Asteroid Alert</h2>
      <p>${params.asteroids.length} critical asteroid(s) matched alert criteria.</p>
      <table style="border-collapse:collapse;width:100%;max-width:800px">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 6px;border-bottom:2px solid #333">Name</th>
            <th style="padding:8px 6px;border-bottom:2px solid #333">Torino</th>
            <th style="padding:8px 6px;border-bottom:2px solid #333">Risk</th>
            <th style="padding:8px 6px;border-bottom:2px solid #333">PHA</th>
            <th style="text-align:left;padding:8px 6px;border-bottom:2px solid #333">Size</th>
            <th style="text-align:left;padding:8px 6px;border-bottom:2px solid #333">Velocity</th>
            <th style="text-align:left;padding:8px 6px;border-bottom:2px solid #333">Miss Dist.</th>
            <th style="text-align:left;padding:8px 6px;border-bottom:2px solid #333">Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin-top:16px">
        View details: <a href="${appUrl}/dashboard">AstroWatch Dashboard</a>
      </p>
      <p style="color:#888;font-size:12px;">This is an experimental alert; predictions are not authoritative.</p>
    </div>
  `;

  try {
    const sendResult = await resend.emails.send({
      from,
      to: params.to,
      subject,
      html,
    });
    return { id: (sendResult as any)?.id };
  } catch (err: any) {
    console.error('Failed to send critical asteroid email:', err);
    return { error: err?.message || 'Unknown error' };
  }
}

