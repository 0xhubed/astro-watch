'use client';

import { useState, useEffect } from 'react';
import { APOD } from '@/lib/nasa-api';
import { Calendar, Download, Info, ChevronLeft, ChevronRight, ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function PictureOfTheDay() {
  const [apod, setApod] = useState<APOD | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadAPOD(selectedDate);
  }, [selectedDate]);

  const loadAPOD = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/apod?date=${date}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setApod(data);
    } catch (err) {
      setError('Failed to load Picture of the Day');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const today = new Date();

    // Don't go beyond today
    if (current <= today) {
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };

  const downloadImage = () => {
    if (apod?.hdurl || apod?.url) {
      window.open(apod.hdurl || apod.url, '_blank');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-black text-white bg-stars">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h1 className="text-2xl md:text-4xl font-bold">NASA Picture of the Day</h1>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to AstroWatch</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none"
                aria-label="Picture date"
              />
            </div>

            <button
              onClick={() => navigateDate(1)}
              disabled={selectedDate === todayStr}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="grid lg:grid-cols-2 gap-8 animate-pulse" aria-label="Loading picture">
            <div className="aspect-square max-h-[520px] w-full rounded-lg bg-white/5" />
            <div className="space-y-5">
              <div className="h-9 w-3/4 rounded bg-white/5" />
              <div className="rounded-lg bg-white/5 p-6 space-y-3">
                <div className="h-5 w-36 rounded bg-white/5" />
                <div className="h-4 w-full rounded bg-white/5" />
                <div className="h-4 w-full rounded bg-white/5" />
                <div className="h-4 w-5/6 rounded bg-white/5" />
                <div className="h-4 w-2/3 rounded bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 rounded-lg bg-white/5" />
                <div className="h-20 rounded-lg bg-white/5" />
              </div>
            </div>
          </div>
        ) : error || !apod ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg text-white/80">{error || 'No data available'}</p>
            <p className="text-sm text-white/50 mt-2">
              NASA&apos;s APOD service may be briefly unavailable, or the date has no image.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => loadAPOD(selectedDate)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Jump to today
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image/Video Section */}
            <div className="relative group">
              {apod.media_type === 'image' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={apod.url}
                  alt={apod.title}
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              ) : apod.url.endsWith('.mp4') || apod.url.endsWith('.webm') ? (
                <div className="relative aspect-video">
                  <video
                    src={apod.url}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full h-full rounded-lg object-contain bg-black"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="relative aspect-video">
                  <iframe
                    src={apod.url}
                    title={apod.title}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Download Button (for images) — always visible on touch */}
              {apod.media_type === 'image' && (
                <button
                  onClick={downloadImage}
                  className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Download high resolution image"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">{apod.title}</h2>
                {apod.copyright && (
                  <p className="text-white/60 text-sm">© {apod.copyright}</p>
                )}
              </div>

              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-semibold">Explanation</h3>
                </div>
                <p className="text-white/80 leading-relaxed">{apod.explanation}</p>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-sm mb-1">Date</div>
                  <div className="font-mono">
                    {new Date(apod.date + 'T00:00:00').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-white/60 text-sm mb-1">Media Type</div>
                  <div className="font-mono capitalize">{apod.media_type}</div>
                </div>
              </div>

              {/* HD Download Link */}
              {apod.hdurl && apod.media_type === 'image' && (
                <a
                  href={apod.hdurl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download HD Image
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
