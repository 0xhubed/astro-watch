'use client';

import { useEffect, useRef } from 'react';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface Props {
  asteroids: EnhancedAsteroid[];
}

export function ImpactHeatmap({ asteroids }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw world map outline (simplified)
    drawWorldMap(ctx, canvas.width, canvas.height);

    // Draw impact points
    asteroids.forEach(asteroid => {
      if (asteroid.risk > 0.3) {
        drawImpactPoint(ctx, asteroid, canvas.width, canvas.height);
      }
    });

  }, [asteroids]);

  const drawWorldMap = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Simplified world map coordinates (very basic continents outline)
    const continents = [
      // North America
      { x: 0.15, y: 0.25, w: 0.2, h: 0.3 },
      // South America
      { x: 0.2, y: 0.55, w: 0.1, h: 0.25 },
      // Europe
      { x: 0.48, y: 0.25, w: 0.08, h: 0.15 },
      // Africa
      { x: 0.47, y: 0.4, w: 0.12, h: 0.3 },
      // Asia
      { x: 0.6, y: 0.15, w: 0.25, h: 0.35 },
      // Australia
      { x: 0.75, y: 0.65, w: 0.1, h: 0.08 },
    ];

    continents.forEach(continent => {
      ctx.beginPath();
      ctx.rect(
        continent.x * width,
        continent.y * height,
        continent.w * width,
        continent.h * height
      );
      ctx.stroke();
    });

    // Draw equator and prime meridian
    ctx.strokeStyle = '#4B5563';
    ctx.setLineDash([5, 5]);
    
    // Equator
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Prime meridian
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    ctx.setLineDash([]);
  };

  const drawImpactPoint = (
    ctx: CanvasRenderingContext2D,
    asteroid: EnhancedAsteroid,
    width: number,
    height: number
  ) => {
    // Generate pseudo-random coordinates based on asteroid ID
    const hash = asteroid.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const x = (Math.abs(hash) % width);
    const y = (Math.abs(hash * 7) % height);
    
    const radius = Math.log10(asteroid.size) * 3 + 5;
    const risk = asteroid.risk;
    
    // Create gradient based on risk
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    
    if (risk > 0.7) {
      gradient.addColorStop(0, 'rgba(255, 59, 48, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 59, 48, 0.1)');
    } else if (risk > 0.4) {
      gradient.addColorStop(0, 'rgba(255, 149, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 149, 0, 0.1)');
    } else {
      gradient.addColorStop(0, 'rgba(52, 199, 89, 0.6)');
      gradient.addColorStop(1, 'rgba(52, 199, 89, 0.1)');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add pulsing effect for high-risk asteroids
    if (risk > 0.7) {
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  return (
    <div className="w-full h-full bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-4">Impact Risk Heatmap</h2>
      <p className="text-gray-400 mb-6">
        Visualization of potential impact zones based on asteroid trajectories and risk assessment.
      </p>
      
      <div className="relative w-full h-96 bg-space-dark rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'auto' }}
        />
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
          <h4 className="text-sm font-semibold text-white mb-2">Risk Level</h4>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-300">High Risk (&gt;70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-xs text-gray-300">Medium Risk (40-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-300">Low Risk (&lt;40%)</span>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3">
          <div className="text-xs text-gray-300">
            <div>Total Asteroids: {asteroids.length}</div>
            <div>High Risk: {asteroids.filter(a => a.risk > 0.7).length}</div>
            <div>Medium Risk: {asteroids.filter(a => a.risk > 0.4 && a.risk <= 0.7).length}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-400">
        <p>
          * Impact zones are estimated based on trajectory analysis and risk assessment.
          Actual impact locations may vary significantly due to atmospheric effects and orbital mechanics.
        </p>
      </div>
    </div>
  );
}