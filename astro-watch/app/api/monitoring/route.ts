import { NextResponse } from 'next/server';
import { fetchNEOFeed, EnhancedAsteroid } from '@/lib/nasa-api';
import { sendCriticalAsteroidsEmail } from '@/lib/email';

function getEnvBool(name: string, def: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return def;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function getEnvNum(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export async function GET(request: Request) {
  try {
    // Date range: today -> +7 days (NASA feed max window)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const torinoMin = getEnvNum('ALERT_TORINO_MIN', 6);
    const riskMin = getEnvNum('ALERT_RISK_MIN', 0.75);
    const onlyPHA = getEnvBool('ALERT_ONLY_PHA', true);

    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dry') === '1';

    const to = process.env.NOTIFICATION_EMAIL;
    const alertsEnabled = (process.env.ALERTS_ENABLED ?? 'true').toLowerCase() !== 'false';
    const sendingEnabled = Boolean(process.env.RESEND_API_KEY && to && alertsEnabled && !dryRun);

    // Fetch & enrich
    const asteroids = await fetchNEOFeed(start, end);

    // Filter critical
    const critical = asteroids.filter(isCritical(torinoMin, riskMin, onlyPHA));

    let sent = false;
    let emailId: string | undefined;

    if (critical.length > 0 && sendingEnabled) {
      const summaries = critical.map(a => toSummary(a));
      const result = await sendCriticalAsteroidsEmail({
        to: to!,
        asteroids: summaries,
      });
      sent = Boolean(result && !(result as any).error);
      emailId = (result as any)?.id;
    }

    return NextResponse.json({
      range: { start, end },
      counts: { total: asteroids.length, critical: critical.length },
      thresholds: { torinoMin, riskMin, onlyPHA },
      email: { enabled: sendingEnabled, sent, id: emailId, to, dryRun, alertsEnabled },
      sample: critical.slice(0, 5).map(a => ({ id: a.id, name: a.name, torinoScale: a.torinoScale, risk: a.risk })),
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    return NextResponse.json({ error: 'Monitoring run failed' }, { status: 500 });
  }
}

function isCritical(torinoMin: number, riskMin: number, onlyPHA: boolean) {
  return (a: EnhancedAsteroid) => {
    const torinoMatch = a.torinoScale >= torinoMin;
    const riskMatch = a.risk >= riskMin && (!onlyPHA || a.is_potentially_hazardous_asteroid);
    return torinoMatch || riskMatch;
  };
}

function toSummary(a: EnhancedAsteroid) {
  return {
    id: a.id,
    name: a.name,
    torinoScale: a.torinoScale,
    risk: a.risk,
    isPHA: a.is_potentially_hazardous_asteroid,
    size: a.estimated_diameter.meters.estimated_diameter_max,
    velocity: a.velocity,
    missDistance: a.missDistance,
    closeApproachDate: a.close_approach_data?.[0]?.close_approach_date,
  };
}
