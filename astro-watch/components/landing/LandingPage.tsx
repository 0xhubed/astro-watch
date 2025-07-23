'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Shield, Activity, Globe, Sparkles, Telescope, AlertTriangle, BarChart3, Orbit, Github, Twitter, Rocket, Satellite } from 'lucide-react';
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
      description: "Watch asteroids orbit in real-time. Zoom, rotate, and explore our cosmic neighborhood."
    },
    {
      icon: <Satellite className="w-6 h-6" />,
      title: "Track & Follow",
      description: "Select any asteroid to see its trajectory, speed, and closest approach to Earth."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "ML Predictions",
      description: "Experimental machine learning models that attempt to enhance trajectory predictions."
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Charts, graphs, and statistics to explore patterns in asteroid behavior and risk distributions."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Risk Assessment",
      description: "Torino Scale ratings and threat analysis to understand asteroid risk levels."
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
      <div className="fixed inset-0 z-0 w-screen overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-purple-950/20" />
        
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
        
        {/* Nebula effects */}
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-4 py-3 md:px-12 md:py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <Orbit className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
          <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
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
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8"
        >
          <Rocket className="w-16 h-16 md:w-20 md:h-20 text-blue-400 mx-auto mb-4" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 md:mb-6 px-2"
        >
          Explore Near-Earth
          <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Asteroids
          </span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-base sm:text-lg md:text-xl text-gray-400 mb-6 md:mb-8 max-w-2xl mx-auto px-4"
        >
          An interactive visualization platform for NASA's asteroid data. 
          Track orbital paths, analyze trajectories, and understand what's moving through our solar system.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <Link
            href="/dashboard"
            className="px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 flex items-center gap-2 group text-sm md:text-base"
          >
            Enter Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            href="/apod"
            className="px-6 py-3 md:px-8 md:py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-sm md:text-base"
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
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          <span className="text-gray-300">
            {isLoading ? (
              <span className="inline-block w-8 h-4 bg-gray-700 rounded animate-pulse" />
            ) : (
              <span className="text-white font-semibold">{asteroidCount}</span>
            )}
            {' '}asteroids tracked today
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
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
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
                className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-400 group-hover:text-blue-300 transition-colors">
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
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Understanding Our Cosmic Neighborhood
          </h2>
          <div className="space-y-6 text-gray-400">
            <p className="text-base md:text-lg px-4 md:px-0">
              AstroWatch transforms NASA's asteroid data into interactive visualizations that make 
              complex orbital mechanics accessible to everyone. We combine real-time data with 
              intuitive interfaces to help you understand what's moving through our solar system.
            </p>
            <p className="text-base md:text-lg px-4 md:px-0">
              Our platform includes experimental machine learning models for trajectory prediction 
              and risk assessment. While NASA's data is authoritative and updated regularly, 
              our ML predictions are research-grade and should be considered alongside official sources.
            </p>
            <p className="text-base md:text-lg px-4 md:px-0">
              Whether you're a researcher, student, or space enthusiast, AstroWatch provides 
              the tools to explore and understand near-Earth asteroids. No specialized knowledge 
              required – just curiosity about our place in space.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-12 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl border border-gray-800 backdrop-blur-sm"
          >
            <h3 className="text-xl font-semibold text-white mb-2">Real Data, Real Time</h3>
            <p className="text-gray-400">
              Powered by NASA's Near-Earth Object API. Updated every 15 minutes because 
              space rocks don't wait for anyone.
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
          {/* Asteroid visualization */}
          <div className="relative mb-8">
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 50,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-32 h-32 mx-auto"
            >
              <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full" />
              <div className="absolute inset-4 border border-purple-500/20 rounded-full" />
              <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-blue-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <motion.div
                animate={{
                  rotate: -720,
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute top-2 right-8 w-2 h-2 bg-gray-400 rounded-full"
              />
            </motion.div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Begin Your Exploration
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Start visualizing real-time asteroid data and orbital mechanics
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 group"
          >
            Launch Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-6 md:px-12 md:py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Orbit className="w-6 h-6 text-blue-400" />
            <span className="text-lg font-semibold text-white">AstroWatch</span>
          </div>
          
          <p className="text-gray-400 text-sm">
            © 2025 Daniel Huber. Data provided by NASA NEO API.
          </p>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com" className="text-gray-400 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://twitter.com" className="text-gray-400 hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}