import { loadBriefing } from '@/lib/agent/memory';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function BriefingsPage() {
  const briefing = await loadBriefing();

  return (
    <div className="min-h-screen bg-space-dark text-white bg-stars">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-2 gap-3">
          <h1 className="text-3xl font-semibold">NEO Daily Briefing</h1>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0 text-sm"
          >
            ← Dashboard
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Written by the AstroWatch monitoring agent · runs every 4 hours
        </p>

        {!briefing ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-white/80">No briefing available yet.</p>
            <p className="text-white/50 text-sm mt-2">
              The monitoring agent publishes its next summary after its 4-hourly run.
              Everything else on the dashboard works without it.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-5 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm transition-colors"
            >
              Explore the dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-blue-300 mb-3">Summary</h2>
              <p className="text-gray-300 leading-relaxed">{briefing.summary}</p>
            </section>

            {briefing.highlights.length > 0 && (
              <section className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-blue-300 mb-3">Highlights</h2>
                <ul className="space-y-2">
                  {briefing.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-blue-400 mt-1">&bull;</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="border-t border-gray-800 pt-4 text-xs text-gray-500">
              AI-generated summary, not expert analysis &bull; {briefing.date}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
