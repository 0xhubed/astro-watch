import { EnhancedAsteroid } from './nasa-api';

export interface ApproachDataPoint {
  date: string;
  distance: number;
  daysFromClosest: number;
}

export function computeApproachCurve(
  asteroid: EnhancedAsteroid,
  windowDays = 14,
  points = 50,
): ApproachDataPoint[] {
  const dMin = asteroid.missDistance;
  const vKmS = asteroid.velocity;
  const vAuDay = (vKmS * 86400) / 149597870.7;

  const closestDateStr = asteroid.close_approach_data[0]?.close_approach_date;
  const closestDate = closestDateStr ? new Date(closestDateStr) : new Date();

  const halfWindow = windowDays / 2;
  const result: ApproachDataPoint[] = [];

  for (let i = 0; i < points; i++) {
    const daysFromClosest = -halfWindow + (i / (points - 1)) * windowDays;
    const distance = Math.sqrt(dMin * dMin + Math.pow(vAuDay * daysFromClosest, 2));

    const date = new Date(closestDate);
    date.setDate(date.getDate() + daysFromClosest);

    result.push({
      date: date.toISOString().split('T')[0],
      distance: Math.round(distance * 10000) / 10000,
      daysFromClosest: Math.round(daysFromClosest * 10) / 10,
    });
  }

  return result;
}
