'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface Props {
  asteroids: EnhancedAsteroid[];
}

// Helper functions for texture creation
function createProceduralTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // Ocean base with radial gradient
  const oceanGradient = ctx.createRadialGradient(512, 256, 0, 512, 256, 300);
  oceanGradient.addColorStop(0, '#2563eb');
  oceanGradient.addColorStop(0.7, '#1d4ed8');
  oceanGradient.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, 1024, 512);
  
  // Enhanced continents with curves
  ctx.fillStyle = '#2d7a2d';
  
  // North America with coastline details
  ctx.beginPath();
  ctx.moveTo(120, 120);
  ctx.bezierCurveTo(180, 100, 280, 110, 320, 140);
  ctx.bezierCurveTo(340, 200, 300, 240, 260, 260);
  ctx.bezierCurveTo(200, 250, 150, 230, 120, 180);
  ctx.closePath();
  ctx.fill();
  
  // Europe/Africa with Mediterranean
  ctx.beginPath();
  ctx.ellipse(400, 180, 80, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(420, 280, 90, 120, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Asia
  ctx.beginPath();
  ctx.ellipse(600, 160, 120, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Australia
  ctx.beginPath();
  ctx.ellipse(720, 320, 60, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Add realistic ice caps
  const iceGradient = ctx.createRadialGradient(512, 30, 0, 512, 30, 150);
  iceGradient.addColorStop(0, '#ffffff');
  iceGradient.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = iceGradient;
  ctx.fillRect(0, 0, 1024, 60);
  ctx.fillRect(0, 450, 1024, 62);
  
  const earthTexture = new THREE.CanvasTexture(canvas);
  earthTexture.wrapS = THREE.RepeatWrapping;
  earthTexture.wrapT = THREE.ClampToEdgeWrapping;
  
  return earthTexture;
}

function createNormalMap() {
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = 512;
  normalCanvas.height = 256;
  const normalCtx = normalCanvas.getContext('2d')!;
  
  normalCtx.fillStyle = '#8080ff';
  normalCtx.fillRect(0, 0, 512, 256);
  
  // Add surface bumps
  normalCtx.fillStyle = '#a0a0ff';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    normalCtx.fillRect(x, y, 8, 8);
  }
  
  return new THREE.CanvasTexture(normalCanvas);
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Earth texture state that can be updated
  const [earthTexture, setEarthTexture] = useState<THREE.Texture>(() => createProceduralTexture());
  
  // Try to load NASA texture on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/earth_day.jpg',
      (texture) => {
        // Success callback
        if (isMounted) {
          console.log('✅ NASA Earth texture loaded successfully (Globe)');
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          // Update the texture state
          setEarthTexture(texture);
        }
      },
      undefined,
      (error) => {
        // Error callback
        if (isMounted) {
          console.log('⚠️ NASA texture not found, using procedural texture (Globe)');
          console.log('To add realistic textures, run: ./scripts/download-textures.sh');
        }
      }
    );
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Create normal map
  const earthNormalMap = useMemo(() => createNormalMap(), []);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group>
      {/* Earth Surface with NASA satellite imagery */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[2, 128, 128]} />
        <meshStandardMaterial
          map={earthTexture}
          normalMap={earthNormalMap}
          normalScale={new THREE.Vector2(0.15, 0.15)}
          roughness={0.6}
          metalness={0.02}
        />
      </mesh>
      
      {/* Subtle atmosphere */}
      <mesh scale={[1.015, 1.015, 1.015]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0x87ceeb)}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function AsteroidApproaches({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  return (
    <group>
      {asteroids.slice(0, 10).map((asteroid, i) => (
        <AsteroidApproach key={asteroid.id} asteroid={asteroid} index={i} />
      ))}
    </group>
  );
}

function AsteroidApproach({ asteroid, index }: { asteroid: EnhancedAsteroid; index: number }) {
  const asteroidRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const { points, asteroidPosition, asteroidSize } = useMemo(() => {
    // Create approach trajectory towards Earth
    const startDistance = 8 + Math.random() * 4;
    const angle = (index / 10) * Math.PI * 2 + Math.random() * 0.5;
    const elevation = (Math.random() - 0.5) * Math.PI * 0.3;
    
    const startPos = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation) * startDistance,
      Math.sin(elevation) * startDistance,
      Math.sin(angle) * Math.cos(elevation) * startDistance
    );
    
    // End near Earth surface
    const endPos = startPos.clone().normalize().multiplyScalar(2.2);
    
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const pos = startPos.clone().lerp(endPos, t);
      points.push(pos);
    }
    
    // Size based on actual asteroid size
    const asteroidSize = Math.max(0.05, Math.min(0.3, asteroid.size / 1000));
    
    return { points, asteroidPosition: startPos, asteroidSize };
  }, [index, asteroid.size]);
  
  useFrame((state) => {
    if (asteroidRef.current) {
      const time = state.clock.elapsedTime * 0.3;
      // Linear progression from start to end, then restart
      const t = ((time + index * 2) % 10) / 10; // 10 second cycle per asteroid
      const pos = points[0].clone().lerp(points[points.length - 1], t);
      asteroidRef.current.position.copy(pos);
      
      // Hide asteroid when it reaches Earth (impact)
      const opacity = t > 0.95 ? 0 : 1;
      if (asteroidRef.current.material) {
        (asteroidRef.current.material as THREE.MeshStandardMaterial).opacity = opacity;
        (asteroidRef.current.material as THREE.MeshStandardMaterial).transparent = true;
      }
      
      // Add rotation for realism
      asteroidRef.current.rotation.x += 0.01;
      asteroidRef.current.rotation.y += 0.005;
    }
  });
  
  const riskColor = asteroid.risk > 0.7 ? '#ff3333' : 
                   asteroid.risk > 0.4 ? '#ffaa00' : '#33ff33';
  
  return (
    <group>
      {/* Enhanced trajectory line with particles */}
      <mesh>
        <tubeGeometry 
          args={[
            new THREE.CatmullRomCurve3(points),
            64,
            0.015,
            8,
            false
          ]} 
        />
        <meshStandardMaterial 
          color={riskColor}
          transparent
          opacity={0.4}
          emissive={riskColor}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Realistic asteroid with irregular shape */}
      <mesh 
        ref={asteroidRef}
        onClick={() => setShowInfo(!showInfo)}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
        scale={isHovered ? [1.3, 1.3, 1.3] : [1, 1, 1]}
      >
        <dodecahedronGeometry args={[asteroidSize, 1]} />
        <meshStandardMaterial 
          color={riskColor}
          roughness={0.9}
          metalness={0.1}
          emissive={riskColor}
          emissiveIntensity={isHovered ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Asteroid information label */}
      {(isHovered || showInfo) && (
        <Html position={asteroidPosition} center>
          <div className="bg-black/90 text-white px-3 py-2 rounded-lg text-xs pointer-events-none border border-white/20 backdrop-blur-sm">
            <div className="font-semibold text-yellow-300">{asteroid.name}</div>
            <div className="text-gray-300 mt-1">
              <div>Size: {asteroid.size.toFixed(1)} m</div>
              <div>Speed: {asteroid.velocity.toFixed(1)} km/s</div>
              <div>Distance: {asteroid.missDistance.toFixed(3)} AU</div>
              <div className={`font-medium ${
                asteroid.risk > 0.7 ? 'text-red-400' : 
                asteroid.risk > 0.4 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                Risk: {(asteroid.risk * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </Html>
      )}
      
      {/* Particle trail effect */}
      <TrailParticles asteroid={asteroid} points={points} />
    </group>
  );
}

// Particle trail effect for asteroids
function TrailParticles({ asteroid, points }: { asteroid: EnhancedAsteroid; points: THREE.Vector3[] }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleData = useMemo(() => {
    const particleCount = 15;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const color = asteroid.risk > 0.7 ? [1, 0.2, 0.2] : 
                 asteroid.risk > 0.4 ? [1, 0.7, 0] : [0.2, 1, 0.2];
    
    for (let i = 0; i < particleCount; i++) {
      const pointIndex = Math.floor((i / particleCount) * points.length);
      const point = points[pointIndex] || points[0];
      
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      
      const alpha = (particleCount - i) / particleCount;
      colors[i * 3] = color[0] * alpha;
      colors[i * 3 + 1] = color[1] * alpha;
      colors[i * 3 + 2] = color[2] * alpha;
      
      sizes[i] = 0.02 * alpha;
    }
    
    return { positions, colors, sizes };
  }, [asteroid, points]);
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          args={[particleData.positions, 3]} 
          count={15} 
        />
        <bufferAttribute 
          attach="attributes-color" 
          args={[particleData.colors, 3]} 
          count={15} 
        />
        <bufferAttribute 
          attach="attributes-size" 
          args={[particleData.sizes, 1]} 
          count={15} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={1} 
        vertexColors 
        transparent 
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
      />
    </points>
  );
}

function ImpactZones({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  const zones = useMemo(() => {
    return asteroids.slice(0, 8).map((asteroid, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const lat = (Math.random() - 0.5) * Math.PI * 0.8;
      
      const position = new THREE.Vector3(
        Math.cos(angle) * Math.cos(lat) * 2.05,
        Math.sin(lat) * 2.05,
        Math.sin(angle) * Math.cos(lat) * 2.05
      );
      
      return { asteroid, position };
    });
  }, [asteroids]);
  
  return (
    <group>
      {zones.map(({ asteroid, position }, i) => (
        <mesh key={asteroid.id} position={position}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial 
            color={asteroid.risk > 0.7 ? '#ff0000' : asteroid.risk > 0.4 ? '#ffaa00' : '#00ff00'}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

function StatsPanel({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  const stats = useMemo(() => {
    const high = asteroids.filter(a => a.risk > 0.7);
    const medium = asteroids.filter(a => a.risk > 0.4 && a.risk <= 0.7);
    const low = asteroids.filter(a => a.risk <= 0.4);
    
    const avgSize = asteroids.length > 0 
      ? asteroids.reduce((sum, a) => sum + a.size, 0) / asteroids.length 
      : 0;
      
    const closestDistance = asteroids.length > 0 
      ? Math.min(...asteroids.map(a => a.missDistance)) 
      : 0;
      
    return {
      high: high.length,
      medium: medium.length,
      low: low.length,
      total: asteroids.length,
      avgSize,
      closestDistance,
      largestAsteroid: asteroids.reduce((largest, current) => 
        current.size > largest.size ? current : largest, asteroids[0] || { size: 0, name: 'None' })
    };
  }, [asteroids]);
  
  return (
    <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md rounded-xl p-4 border border-white/20 max-w-sm">
      <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse"></span>
        Near-Earth Asteroid Tracking
      </h3>
      
      {/* Risk Level Breakdown */}
      <div className="space-y-2 text-xs text-white/90 mb-4">
        <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Risk Classification</div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <span>High Risk (&gt;70%)</span>
          </span>
          <span className="font-mono font-semibold text-red-400">{stats.high}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span>Medium Risk (40-70%)</span>
          </span>
          <span className="font-mono font-semibold text-yellow-400">{stats.medium}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span>Low Risk (&lt;40%)</span>
          </span>
          <span className="font-mono font-semibold text-green-400">{stats.low}</span>
        </div>
      </div>
      
      {/* Key Statistics */}
      <div className="border-t border-white/20 pt-3">
        <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Key Statistics</div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span>Total Tracked:</span>
            <span className="font-mono font-semibold">{stats.total}</span>
          </div>
          <div className="flex justify-between">
            <span>Average Size:</span>
            <span className="font-mono">{stats.avgSize.toFixed(0)} m</span>
          </div>
          <div className="flex justify-between">
            <span>Closest Approach:</span>
            <span className="font-mono">{stats.closestDistance.toFixed(3)} AU</span>
          </div>
          <div className="flex justify-between">
            <span>Largest Object:</span>
            <span className="font-mono truncate max-w-20" title={stats.largestAsteroid?.name}>
              {stats.largestAsteroid?.name?.substring(0, 10) || 'None'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Educational Note */}
      <div className="border-t border-white/20 pt-3 mt-3">
        <div className="text-xs text-blue-300 italic">
          💡 Hover over asteroids to see detailed information. 
          Click to pin details. Red trails indicate higher impact risk.
        </div>
      </div>
    </div>
  );
}

// Educational legend component
function EducationalLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-black/50 backdrop-blur-md rounded-xl p-4 border border-white/20">
      <h4 className="text-white text-xs font-bold mb-3 flex items-center gap-2">
        <span className="text-yellow-400">📖</span>
        Understanding the Visualization
      </h4>
      
      <div className="space-y-3 text-xs text-white/90">
        {/* Visual Elements */}
        <div>
          <div className="text-white/70 font-semibold mb-1">Visual Elements:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Earth with NASA satellite imagery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-red-300"></div>
              <span>Asteroid approach trajectories</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>Moving asteroids (size = actual scale)</span>
            </div>
          </div>
        </div>
        
        {/* Color Coding */}
        <div>
          <div className="text-white/70 font-semibold mb-1">Risk Color Coding:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>High Risk (&gt;70% impact probability)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Medium Risk (40-70%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Low Risk (&lt;40%)</span>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="border-t border-white/20 pt-2">
          <div className="text-white/70 font-semibold mb-1">Controls:</div>
          <div className="text-white/80 text-xs">
            • <strong>Mouse:</strong> Rotate and zoom Earth view<br/>
            • <strong>Hover:</strong> Show asteroid details<br/>
            • <strong>Click:</strong> Pin asteroid information
          </div>
        </div>
      </div>
    </div>
  );
}

export function InteractiveGlobe({ asteroids }: Props) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-space-dark via-blue-900/20 to-space-dark relative">
      <Canvas 
        camera={{ position: [0, 0, 6], fov: 60 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#000022', 8, 20]} />
          
          {/* Enhanced lighting for dramatic effect */}
          <ambientLight intensity={0.2} color={0x404080} />
          
          {/* Primary sunlight */}
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={2.2} 
            color={0xFDB813}
            castShadow={true}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          
          {/* Rim lighting */}
          <directionalLight 
            position={[-3, 2, -3]} 
            intensity={0.8} 
            color={0x4488ff}
            castShadow={false}
          />
          
          {/* Asteroid glow effect */}
          <pointLight 
            position={[-5, 0, 0]} 
            intensity={1.2} 
            color={0xff6600} 
            decay={2}
            distance={20}
          />
          
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={3}
            maxDistance={12}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.8}
            zoomSpeed={1.0}
          />
          
          <Earth />
          <AsteroidApproaches asteroids={asteroids} />
          <ImpactZones asteroids={asteroids} />
        </Suspense>
      </Canvas>
      
      {/* Educational Panels */}
      <StatsPanel asteroids={asteroids} />
      <EducationalLegend />
      
      {/* Title */}
      <div className="absolute top-4 right-4 z-10 text-right">
        <h2 className="text-white text-lg font-bold mb-1">Earth Impact Analysis</h2>
        <p className="text-white/60 text-sm">Real-time asteroid approach visualization</p>
      </div>
    </div>
  );
}