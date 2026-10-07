import { loadThreat } from '@/lib/agent/memory';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ThreatPage({ params }: Props) {
  const { id } = await params;
  const threat = await loadThreat(id);

  if (!threat) notFound();

  const riskColors: Record<string, string> = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/15 text-green-400 border-green-500/30',
    none: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  };

  const riskLevel = threat.level;
  const riskClass = riskColors[riskLevel] ?? riskColors.medium;
  const assessedAt = new Date(threat.assessedAt);
  const assessedLabel = Number.isNaN(assessedAt.getTime())
    ? threat.assessedAt
    : assessedAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });

  return (
    <div className="min-h-screen bg-space-dark text-white bg-stars">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className={`inline-block px-3 py-1 rounded border text-xs font-semibold uppercase ${riskClass}`}>
            {riskLevel} risk
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0 text-sm"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-semibold mb-2">Asteroid {threat.asteroidId}</h1>
        <p className="text-gray-400 text-sm mb-8">
          Threat assessment &bull; assessed {assessedLabel} (UTC)
        </p>

        <section className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-300 mb-3">Summary</h2>
          <p className="text-gray-300 leading-relaxed">{threat.summary}</p>
        </section>

        {threat.factors.length > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-amber-300 mb-3">Risk Factors</h2>
            <ul className="space-y-2">
              {threat.factors.map((factor, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300">
                  <span className="text-amber-400 mt-0.5 font-semibold">!</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="border-t border-gray-800 pt-4 text-xs text-gray-500">
          AI-generated assessment, not expert analysis &bull; Asteroid ID: {id}
        </div>
      </div>
    </div>
  );
}
