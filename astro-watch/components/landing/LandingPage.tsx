'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Shield, Activity, Sparkles, Telescope, BarChart3, Satellite, Orbit } from 'lucide-react';
import { useState, useEffect } from 'react';

export function LandingPage() {
  const [asteroidCount, setAsteroidCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/asteroids?range=day')
      .then(res => res.json())
      .then(data => {
        setAsteroidCount(data.asteroids?.length || 0);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const features = [
    {
      icon: <Orbit className="w-6 h-6" />,
      title: "Live 3D Visualization",
      description: "Browse asteroid orbits in an interactive 3D scene. Zoom, rotate, and look around."
    },
    {
      icon: <Satellite className="w-6 h-6" />,
      title: "Track & Follow",
      description: "Select any asteroid to see its trajectory, speed, and closest approach to Earth."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Assistant",
      description: "Ask questions about asteroids, control the 3D view, and get AI-powered risk analysis."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Charts, graphs, and statistics to explore patterns in orbital data and close-approach frequency."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Risk Assessment",
      description: "Close-approach rarity ratings to help contextualize how unusual each flyby is."
    },
    {
      icon: <Telescope className="w-6 h-6" />,
      title: "Daily Discovery",
      description: "NASA's Astronomy Picture of the Day alongside real asteroid data."
    }
  ];

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Deep Space Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />

        {/* Static stars */}
        <div className="absolute inset-0 w-full h-full bg-stars opacity-60" />

        {/* Moving stars */}
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 300,
            ease: 'linear',
            repeat: Infinity,
          }}
          className="absolute inset-0 w-full h-full opacity-40"
          style={{
            backgroundImage: 'radial-gradient(1px 1px at 10% 10%, white, transparent), radial-gradient(1px 1px at 90% 30%, white, transparent), radial-gradient(2px 2px at 50% 60%, white, transparent)',
            backgroundSize: '400px 400px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-4 py-3 md:px-12 md:py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="text-xl md:text-2xl font-semibold text-white tracking-tight">
            AstroWatch
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <a href="#features" className="hidden sm:block text-gray-500 hover:text-gray-300 transition-colors text-sm">Features</a>
          <a href="#about" className="hidden sm:block text-gray-500 hover:text-gray-300 transition-colors text-sm">About</a>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm border border-white/10 text-sm"
          >
            Enter
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-16 md:px-12 md:py-32 text-center">
        {/* Floating asteroid animation */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 right-10 w-4 h-4 bg-gray-400 rounded-full opacity-20"
        />

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-4 md:mb-6 px-2"
        >
          Explore Near-Earth
          <span className="block text-zinc-200">
            Asteroids
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 md:mb-8 max-w-2xl mx-auto px-4"
        >
          A small interactive tool for browsing NASA's asteroid data.
          View orbital paths, explore close approaches, and see what's passing near Earth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <Link
            href="/dashboard"
            className="px-6 py-3 md:px-8 md:py-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-colors flex items-center gap-2 group text-sm md:text-base"
          >
            Enter Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/apod"
            className="px-6 py-3 md:px-8 md:py-4 border border-white/20 hover:bg-white/5 text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
          >
            <Telescope className="w-5 h-5" />
            Picture of the Day
          </Link>
        </motion.div>

        {/* Live Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700"
        >
          <Activity className="w-4 h-4 text-zinc-400 animate-pulse" />
          <span className="text-gray-300">
            {isLoading ? (
              <span className="inline-block w-8 h-4 bg-gray-700 rounded animate-pulse" />
            ) : (
              <span className="text-white font-semibold">{asteroidCount}</span>
            )}
            {' '}near-Earth asteroids listed today
          </span>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 py-16 md:px-12 md:py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center text-white mb-4">
            What You Can Do
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            Interactive tools to explore and understand asteroid data
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-white/[0.02] backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all group"
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 border border-white/10 text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-500 group-hover:text-gray-400 transition-colors">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 px-4 py-16 md:px-12 md:py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-8">
            Understanding Our Cosmic Neighborhood
          </h2>
          <div className="space-y-6 text-gray-400">
            <p className="text-base md:text-lg px-4 md:px-0">
              AstroWatch turns NASA's asteroid data into interactive visualizations.
              It's a personal project aimed at making near-Earth object data easier to
              browse and explore.
            </p>
            <p className="text-base md:text-lg px-4 md:px-0">
              An AI assistant can answer your questions about asteroids, explain risk
              assessments, and control the 3D visualization. An autonomous monitoring
              agent watches for notable approaches and publishes briefings.
            </p>
            <p className="text-base md:text-lg px-4 md:px-0">
              Whether you're a student, hobbyist, or just curious about space,
              AstroWatch is a way to poke around asteroid data without needing
              any specialized knowledge.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-12 p-6 bg-white/[0.02] rounded-xl border border-white/10 backdrop-blur-sm"
          >
            <h3 className="text-xl font-semibold text-white mb-2">Real Data, Refreshed Often</h3>
            <p className="text-gray-400">
              Powered by NASA's Near-Earth Object API. Data refreshes every 15 minutes.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 py-16 md:px-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-4">
            Begin Your Exploration
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Browse asteroid data and orbital visualizations
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black hover:bg-zinc-200 font-medium rounded-lg transition-colors group"
          >
            Launch Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-6 md:px-12 md:py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-lg font-semibold text-white">AstroWatch</span>

          <p className="text-gray-400 text-sm">
            © 2026 Daniel Huber. Data provided by NASA NEO API.
          </p>
        </div>
      </footer>
    </div>
  );
}
