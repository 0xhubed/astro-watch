'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';
import { useAsteroidStore } from '@/lib/store';

const DISMISSED_KEY = 'astrowatch-tour-dismissed';

const STEPS = [
  {
    title: 'Solar System View',
    description:
      'This is a real-time view of near-Earth asteroids from NASA. Drag to rotate, scroll to zoom.',
  },
  {
    title: 'Asteroid Data',
    description:
      'Click any asteroid to see its details — size, speed, miss distance, and risk level.',
  },
  {
    title: 'AI Assistant',
    description:
      'Ask the AI anything — it can search data, explain risks, and control the visualization.',
  },
];

export function GuidedTour() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [step, setStep] = useState(0);
  const setModalOpen = useAsteroidStore(s => s.setModalOpen);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => setShowPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShowPrompt(false);
  }

  function startTour() {
    setShowPrompt(false);
    setStep(0);
    setTourActive(true);
    setModalOpen(true);
    document.body.classList.add('modal-open');
  }

  function replayTour() {
    setShowPrompt(false);
    setStep(0);
    setTourActive(true);
    setModalOpen(true);
    document.body.classList.add('modal-open');
  }

  function nextStep() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      endTour();
    }
  }

  function prevStep() {
    setStep(s => Math.max(0, s - 1));
  }

  function endTour() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setTourActive(false);
    setModalOpen(false);
    document.body.classList.remove('modal-open');
  }

  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Replay button — bottom-left, out of the way */}
      {!tourActive && (
        <button
          onClick={replayTour}
          title="Replay tour"
          className="fixed bottom-20 md:bottom-12 left-4 z-30 p-2 rounded-full bg-gray-800/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors backdrop-blur-sm"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}

      {/* First-visit prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            key="tour-prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 border border-gray-700 shadow-2xl backdrop-blur-md text-white"
          >
            <span className="text-sm font-medium whitespace-nowrap">
              First time here? Take a tour
            </span>
            <button
              onClick={startTour}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
            >
              Start
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour modal */}
      <AnimatePresence>
        {tourActive && (
          <>
            {/* Dimmed backdrop */}
            <motion.div
              key="tour-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={endTour}
            />

            {/* Modal */}
            <motion.div
              key={`tour-step-${step}`}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md mx-4 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-1">
                  <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">
                    Step {step + 1} / {STEPS.length}
                  </span>
                  <button
                    onClick={endTour}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 pt-2 pb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {STEPS[step].title}
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {STEPS[step].description}
                  </p>
                </div>

                {/* Step dots */}
                <div className="flex justify-center gap-2 pb-4">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`block w-2 h-2 rounded-full transition-colors ${
                        i === step ? 'bg-blue-500' : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
                  <button
                    onClick={endTour}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Skip
                  </button>

                  <div className="flex gap-2">
                    {step > 0 && (
                      <button
                        onClick={prevStep}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                    )}
                    <button
                      onClick={nextStep}
                      className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
                    >
                      {isLast ? 'Done' : 'Next'}
                      {!isLast && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
