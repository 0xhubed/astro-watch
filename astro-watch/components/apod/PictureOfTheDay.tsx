'use client';

import { useState, useEffect } from 'react';
import { getAPOD, APOD } from '@/lib/nasa-api';
import { Calendar, Download, Info, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
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
      const data = await getAPOD(date);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !apod) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-red-500">{error || 'No data available'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">NASA Picture of the Day</h1>
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to AstroWatch
            </Link>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center gap-4">
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
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none"
              />
            </div>
            
            <button
              onClick={() => navigateDate(1)}
              disabled={selectedDate === new Date().toISOString().split('T')[0]}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image/Video Section */}
          <div className="relative group">
            {apod.media_type === 'image' ? (
              <img
                src={apod.url}
                alt={apod.title}
                className="w-full h-auto rounded-lg shadow-2xl"
              />
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
            
            {/* Download Button (for images) */}
            {apod.media_type === 'image' && (
              <button
                onClick={downloadImage}
                className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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

            <div className="bg-white/5 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-semibold">Explanation</h3>
              </div>
              <p className="text-white/80 leading-relaxed">{apod.explanation}</p>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">Date</div>
                <div className="font-mono">
                  {new Date(apod.date + 'T00:00:00').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
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
      </div>
    </div>
  );
}