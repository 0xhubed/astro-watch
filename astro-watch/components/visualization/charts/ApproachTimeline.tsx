'use client';

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { computeApproachCurve } from '@/lib/approach-curve';
import { rarityStyle } from '@/lib/rarity-colors';
import { DARK_TOOLTIP, DARK_TOOLTIP_LABEL } from '@/lib/format';

interface Props {
  asteroids: EnhancedAsteroid[];
  compact?: boolean;
}

const FULL_COLORS = ['#8b5cf6', '#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

// Compact sparkline for a single asteroid
function CompactTimeline({ asteroid }: { asteroid: EnhancedAsteroid }) {
  const data = useMemo(() => computeApproachCurve(asteroid), [asteroid]);
  // Gradient id must be unique per asteroid — a shared id collides when
  // several sparklines are mounted at once (SVG ids are global).
  const gradientId = `approachGradient-${asteroid.id}`;
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const rarityHex = rarityStyle(asteroid.rarity).hex;

  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={rarityHex} stopOpacity={0.6} />
            <stop offset="95%" stopColor={rarityHex} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <XAxis dataKey="date" hide />
        <YAxis hide domain={['auto', 'auto']} />

        <Tooltip
          contentStyle={DARK_TOOLTIP}
          labelStyle={DARK_TOOLTIP_LABEL}
          formatter={(value: number) => [`${value.toFixed(4)} AU`, 'Distance']}
          labelFormatter={(label: string) => label}
        />

        <ReferenceLine
          x={today}
          stroke="rgba(255,255,255,0.4)"
          strokeDasharray="3 3"
        />

        <Area
          type="monotone"
          dataKey="distance"
          stroke={rarityHex}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Full multi-asteroid overlay chart
function FullTimeline({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  // Pick top 5 by closest miss distance
  const top5 = useMemo(
    () =>
      [...asteroids]
        .sort((a, b) => a.missDistance - b.missDistance)
        .slice(0, 5),
    [asteroids],
  );

  // Merge curves by date index (use daysFromClosest as common x-axis)
  const merged = useMemo(() => {
    if (top5.length === 0) return [];

    const curves = top5.map((a) => computeApproachCurve(a));
    const length = curves[0].length;

    return Array.from({ length }, (_, i) => {
      const point: Record<string, number | string> = {
        day: curves[0][i].daysFromClosest,
      };
      top5.forEach((asteroid, idx) => {
        point[`d${idx}`] = curves[idx][i].distance;
      });
      return point;
    });
  }, [top5]);

  if (top5.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-800 w-full max-w-full overflow-hidden"
    >
      <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">
        Top 5 Closest Approach Trajectories
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <XAxis
            dataKey="day"
            stroke="#9ca3af"
            tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}d`}
            label={{
              value: 'Days from closest approach',
              position: 'insideBottom',
              offset: -12,
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <YAxis
            stroke="#9ca3af"
            tickFormatter={(v) => `${v.toFixed(2)}`}
            label={{
              value: 'Distance (AU)',
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              fill: '#9ca3af',
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={DARK_TOOLTIP}
            labelStyle={DARK_TOOLTIP_LABEL}
            labelFormatter={(v: number) => `Day ${v > 0 ? '+' : ''}${v}`}
            formatter={(value: number, name: string) => {
              const idx = parseInt(name.replace('d', ''), 10);
              return [`${value.toFixed(4)} AU`, top5[idx]?.name ?? name];
            }}
          />
          <ReferenceLine
            x={0}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="4 4"
            label={{ value: 'Closest', position: 'top', fill: '#9ca3af', fontSize: 10 }}
          />
          <Legend
            formatter={(value: string) => {
              const idx = parseInt(value.replace('d', ''), 10);
              const name = top5[idx]?.name ?? value;
              return (
                <span style={{ color: '#d1d5db', fontSize: 11 }}>
                  {name.length > 22 ? name.slice(0, 20) + '…' : name}
                </span>
              );
            }}
          />
          {top5.map((_, idx) => (
            <Line
              key={idx}
              type="monotone"
              dataKey={`d${idx}`}
              stroke={FULL_COLORS[idx % FULL_COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export function ApproachTimeline({ asteroids, compact = false }: Props) {
  if (asteroids.length === 0) return null;

  if (compact) {
    return <CompactTimeline asteroid={asteroids[0]} />;
  }

  return <FullTimeline asteroids={asteroids} />;
}
