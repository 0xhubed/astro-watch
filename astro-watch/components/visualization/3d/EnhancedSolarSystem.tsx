'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { useAsteroidStore } from '@/lib/store';
import { RiskLegend, getRarityInfo, getRarityColor, getRarity3DColor } from '@/components/ui/RiskLegend';
import { DetailedAsteroidView } from './DetailedAsteroidView';
import { PostProcessingEffects } from './PostProcessing';

interface Props {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid?: EnhancedAsteroid | null;
  onAsteroidSelect?: (asteroid: EnhancedAsteroid | null) => void;
  hoveredAsteroid?: number | null;
  setHoveredAsteroid?: (id: number | null) => void;
}

interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Earth Close-up', position: [0, 10, 20], target: [0, 0, 0] },
  { name: 'Earth-Moon System', position: [0, 30, 50], target: [0, 0, 0] },
  { name: 'Near-Earth Objects', position: [50, 40, 80], target: [0, 0, 0] },
  { name: 'NEO Overview', position: [0, 100, 150], target: [0, 0, 0] },
  { name: 'Inner Solar System', position: [0, 150, 300], target: [0, 0, 0] }
];

// Realistic planet data with accurate astronomical distances (scaled for visualization)
// Real AU distances: Mercury=0.39, Venus=0.72, Earth=1.0, Mars=1.52, Jupiter=5.2, Saturn=9.5, Uranus=19.2, Neptune=30.1
const PLANET_DATA = [
  {
    name: 'Mercury',
    distanceFromSun: 25,    // 0.39 AU * 64 scale factor
    size: 0.8,              // Relative size
    baseColor: '#8c7853',   // Base rocky color
    speed: 0.04,            // Fastest orbit (88 Earth days)
    inclination: 0.01,
    textureType: 'rocky',
    initialPhase: 0.3       // Initial orbital position (30% around orbit)
  },
  {
    name: 'Venus', 
    distanceFromSun: 46,    // 0.72 AU * 64 scale factor
    size: 1.9,
    baseColor: '#ffc649',   // Bright yellow atmosphere
    speed: 0.03,            // 225 Earth days
    inclination: 0.006,
    textureType: 'atmospheric',
    initialPhase: 0.7       // 70% around orbit
  },
  {
    name: 'Earth',
    distanceFromSun: 64,    // 1.0 AU * 64 scale factor (reference)
    size: 2.0,
    baseColor: '#6b93d6',
    speed: 0.02,            // 365 Earth days
    inclination: 0,
    textureType: 'earth',
    initialPhase: 0         // Start at 0 (reference)
  },
  {
    name: 'Mars',
    distanceFromSun: 97,    // 1.52 AU * 64 scale factor
    size: 1.3,
    baseColor: '#cd5c5c',   // Red planet
    speed: 0.015,           // 687 Earth days
    inclination: 0.032,
    textureType: 'rocky',
    initialPhase: 0.15      // 15% around orbit
  },
  {
    name: 'Jupiter',
    distanceFromSun: 333,   // 5.2 AU * 64 scale factor
    size: 8.0,              // Largest planet
    baseColor: '#d8ca9d',   // Gas giant bands
    speed: 0.008,           // 12 Earth years
    inclination: 0.022,
    textureType: 'gasGiant',
    initialPhase: 0.45      // 45% around orbit
  },
  {
    name: 'Saturn',
    distanceFromSun: 608,   // 9.5 AU * 64 scale factor
    size: 7.0,
    baseColor: '#fad5a5',
    speed: 0.006,           // 29 Earth years
    inclination: 0.043,
    hasRings: true,
    textureType: 'gasGiant',
    initialPhase: 0.85      // 85% around orbit
  },
  {
    name: 'Uranus',
    distanceFromSun: 1229,  // 19.2 AU * 64 scale factor
    size: 3.5,
    baseColor: '#4fd0e7',   // Ice giant
    speed: 0.004,           // 84 Earth years
    inclination: 0.013,
    textureType: 'iceGiant',
    initialPhase: 0.55      // 55% around orbit
  },
  {
    name: 'Neptune',
    distanceFromSun: 1926,  // 30.1 AU * 64 scale factor
    size: 3.3,
    baseColor: '#4b70dd',   // Deep blue ice giant
    speed: 0.003,           // 165 Earth years
    inclination: 0.031,
    textureType: 'iceGiant',
    initialPhase: 0.25      // 25% around orbit
  }
];

// Star count used across star field generation and animation
const STAR_COUNT = 8000;

// Shared Fresnel vertex shader used by atmosphere and corona effects
// Includes vUv for shaders that need UV coords; unused varyings are optimized away by the GPU
const FRESNEL_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Shared Fresnel fragment shader parameterized by uniforms (color, power, intensity, alphaScale)
const FRESNEL_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 color;
  uniform float power;
  uniform float intensity;
  uniform float alphaScale;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), power);
    gl_FragColor = vec4(color * intensity, fresnel * alphaScale);
  }
`;

// Reusable constant objects to avoid per-render allocations
const SUN_EMISSIVE_COLOR = new THREE.Color(1.0, 0.6, 0.1);
const EARTH_NORMAL_SCALE = new THREE.Vector2(0.2, 0.2);

// Shared glow sprite texture for asteroid auras
let _glowTexture: THREE.CanvasTexture | null = null;

function getGlowTexture(): THREE.CanvasTexture {
  if (_glowTexture) return _glowTexture;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.3)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  _glowTexture = new THREE.CanvasTexture(canvas);
  return _glowTexture;
}

// Create procedural planet textures
function createPlanetTexture(textureType: string, baseColor: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  switch (textureType) {
    case 'rocky':
      // Rocky planet texture (Mercury, Mars)
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 256);
      
      // Add craters and surface features
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const radius = Math.random() * 15 + 3;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.3})`;
        ctx.fill();
      }
      break;
      
    case 'atmospheric':
      // Venus - thick atmosphere
      const gradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 256);
      gradient.addColorStop(0, '#ffeb3b');
      gradient.addColorStop(0.7, '#ffc107');
      gradient.addColorStop(1, '#ff8f00');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 256);
      
      // Add atmospheric bands
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(0, i * 32, 512, 16);
      }
      break;
      
    case 'gasGiant':
      // Jupiter/Saturn - banded gas giant
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 256);
      
      // Add horizontal bands
      const bandColors = ['rgba(139,121,94,0.8)', 'rgba(160,130,98,0.6)', 'rgba(205,133,63,0.4)'];
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = bandColors[i % bandColors.length];
        ctx.fillRect(0, i * 21, 512, 10 + Math.random() * 8);
      }
      
      // Add the Great Red Spot for Jupiter
      if (baseColor === '#d8ca9d') {
        ctx.beginPath();
        ctx.ellipse(350, 140, 40, 25, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#cd5c5c';
        ctx.fill();
      }
      break;
      
    case 'iceGiant':
      // Uranus/Neptune - ice giants
      const iceGradient = ctx.createRadialGradient(256, 128, 0, 256, 128, 200);
      iceGradient.addColorStop(0, baseColor);
      iceGradient.addColorStop(0.8, '#1976d2');
      iceGradient.addColorStop(1, '#0d47a1');
      ctx.fillStyle = iceGradient;
      ctx.fillRect(0, 0, 512, 256);
      
      // Add subtle atmospheric features
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
        ctx.fillRect(0, i * 42, 512, 20);
      }
      break;
      
    default:
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 512, 256);
  }
  
  return new THREE.CanvasTexture(canvas);
}

// Removed complex Sun texture function that was causing errors

function createMoonTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base lunar surface - varied grey tones
  const baseGradient = ctx.createLinearGradient(0, 0, 1024, 512);
  baseGradient.addColorStop(0, '#b8b8b0');
  baseGradient.addColorStop(0.3, '#a0a098');
  baseGradient.addColorStop(0.6, '#b0b0a8');
  baseGradient.addColorStop(1, '#a8a8a0');
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Add surface noise/regolith texture
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const size = 1 + Math.random() * 3;
    const brightness = 140 + Math.floor(Math.random() * 60);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness - 5})`;
    ctx.fillRect(x, y, size, size);
  }

  // Dark maria (lunar seas) - large dark basaltic plains
  const maria = [
    { x: 350, y: 180, rx: 120, ry: 80, color: '#6b6b65' },   // Mare Imbrium
    { x: 500, y: 200, rx: 80, ry: 60, color: '#707068' },     // Mare Serenitatis
    { x: 580, y: 260, rx: 70, ry: 55, color: '#686862' },     // Mare Tranquillitatis
    { x: 450, y: 280, rx: 50, ry: 40, color: '#6e6e66' },     // Mare Nubium
    { x: 280, y: 240, rx: 60, ry: 45, color: '#6a6a64' },     // Oceanus Procellarum
    { x: 220, y: 200, rx: 90, ry: 70, color: '#656560' },     // Oceanus Procellarum extended
    { x: 620, y: 220, rx: 45, ry: 35, color: '#6c6c66' },     // Mare Crisium
    { x: 480, y: 320, rx: 40, ry: 30, color: '#6d6d67' },     // Mare Fecunditatis
  ];

  for (const m of maria) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, Math.max(m.rx, m.ry));
    grad.addColorStop(0, m.color);
    grad.addColorStop(0.7, m.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Craters - various sizes
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const radius = 1 + Math.random() * 12;

    // Crater shadow (dark interior)
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60,60,55,${0.2 + Math.random() * 0.3})`;
    ctx.fill();

    // Crater rim highlight
    if (radius > 3) {
      ctx.beginPath();
      ctx.arc(x - radius * 0.2, y - radius * 0.2, radius + 1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200,200,195,${0.3 + Math.random() * 0.2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Highland brightness variations
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 30 + Math.random() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#d0d0c8');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  return new THREE.CanvasTexture(canvas);
}


function Moon({ earthPosition, hideLabels }: { earthPosition: [number, number, number]; hideLabels?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Load NASA LROC moon texture with procedural fallback
  const [moonTexture, setMoonTexture] = useState<THREE.Texture>(() => createMoonTexture());

  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/moon.jpg',
      (texture) => {
        if (isMounted) {
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          setMoonTexture(texture);
        }
      },
      undefined,
      () => { /* keep procedural fallback */ }
    );
    return () => { isMounted = false; };
  }, []);

  useFrame((state) => {
    if (meshRef.current && groupRef.current) {
      const time = state.clock.elapsedTime;
      const moonDistance = 12;
      const moonAngle = time * 0.5;

      const x = earthPosition[0] + Math.cos(moonAngle) * moonDistance;
      const z = earthPosition[2] + Math.sin(moonAngle) * moonDistance;
      const y = earthPosition[1] + Math.sin(moonAngle * 0.1) * 1;

      groupRef.current.position.set(x, y, z);
      // Tidally locked - slow sync rotation
      meshRef.current.rotation.y = moonAngle + Math.PI;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[0.7, 64, 32]} />
        <meshStandardMaterial
          map={moonTexture}
          roughness={0.7}
          metalness={0.0}
          envMapIntensity={0.4}
          emissive={0x333333}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Moon label */}
      {!hideLabels && (
        <Html position={[0, 2.5, 0]} center style={{ zIndex: 10 }}>
          <div className="bg-black/90 text-white px-3 py-1 rounded-lg text-sm font-medium pointer-events-none border border-white/20">
            Moon
          </div>
        </Html>
      )}
    </group>
  );
}

// Enhanced orbital trajectory component - always visible
function PlanetaryTrajectories() {
  return (
    <group>
      {PLANET_DATA.map((planet) => (
        <mesh 
          key={`orbit-${planet.name}`} 
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={1}
        >
          <ringGeometry args={[planet.distanceFromSun - 0.5, planet.distanceFromSun + 0.5, 256]} />
          <meshBasicMaterial 
            color={planet.baseColor}
            transparent={true}
            opacity={0.25}
            depthWrite={false}
            depthTest={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Add orbital markers for better visibility */}
      {PLANET_DATA.map((planet) => (
        <group key={`orbit-markers-${planet.name}`}>
          {/* Create orbital markers every 30 degrees */}
          {Array.from({ length: 12 }, (_, i) => {
            const baseAngle = (i * 30) * Math.PI / 180;
            const initialPhaseAngle = (planet.initialPhase || 0) * Math.PI * 2;
            const angle = baseAngle + initialPhaseAngle;
            const x = Math.cos(angle) * planet.distanceFromSun;
            const z = Math.sin(angle) * planet.distanceFromSun;
            const y = Math.sin(angle * 0.3) * planet.inclination * 10;
            
            return (
              <mesh 
                key={`marker-${i}`} 
                position={[x, y, z]}
                renderOrder={2}
              >
                <sphereGeometry args={[0.2, 8, 4]} />
                <meshBasicMaterial 
                  color={planet.baseColor}
                  transparent={true}
                  opacity={0.4}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Earth texture state that can be updated
  const [earthTexture, setEarthTexture] = useState<THREE.Texture>(() => createProceduralEarthTexture());
  
  // Try to load NASA texture on component mount with proper error handling
  useEffect(() => {
    let isMounted = true;
    
    const loadTexture = async () => {
      try {
        const loader = new THREE.TextureLoader();
        
        // Wrap the loader in a Promise to handle it properly
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            '/textures/earth_day.jpg',
            (texture) => resolve(texture),
            undefined,
            (error) => reject(error)
          );
        });
        
        // Success - NASA texture loaded
        if (isMounted) {
          console.log('✅ NASA Earth texture loaded successfully');
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          setEarthTexture(texture);
        }
      } catch (error) {
        // Error handled - NASA texture failed to load
        if (isMounted) {
          console.log('⚠️ NASA texture not found, using procedural texture');
          console.log('To add realistic textures, run: ./scripts/download-textures.sh');
          // Keep using the procedural texture that's already set
        }
      }
    };
    
    // Call the async function
    loadTexture();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Create other textures
  const { earthNormalMap, earthSpecularMap } = useMemo(() => {
    
    // Create normal map for surface bumps
    const earthNormalMap = createEarthNormalMap();
    
    // Create specular map for water reflection
    const earthSpecularMap = createEarthSpecularMap();
    
    return { earthNormalMap, earthSpecularMap };
  }, []);
  
  // Enhanced procedural texture creation (fallback)
  function createProceduralEarthTexture() {
    // Main Earth texture with higher resolution
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;
    
    // Create realistic ocean base with depth variations
    const oceanGradient = ctx.createRadialGradient(2048, 1024, 0, 2048, 1024, 1024);
    oceanGradient.addColorStop(0, '#1e40af');
    oceanGradient.addColorStop(0.3, '#1d4ed8');
    oceanGradient.addColorStop(0.7, '#1e3a8a');
    oceanGradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, 4096, 2048);
    
    // Add ocean depth variations
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 4096;
      const y = Math.random() * 2048;
      const radius = 20 + Math.random() * 80;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(30, 64, 175, 0.6)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.3)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Detailed continents with realistic colors
    const landGradient = ctx.createLinearGradient(0, 0, 0, 2048);
    landGradient.addColorStop(0, '#065f46');  // Dark forest
    landGradient.addColorStop(0.3, '#059669'); // Forest green
    landGradient.addColorStop(0.6, '#16a34a'); // Grassland
    landGradient.addColorStop(0.8, '#ca8a04'); // Desert
    landGradient.addColorStop(1, '#92400e');   // Arid
    
    // North America - more detailed coastline
    ctx.fillStyle = landGradient;
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.bezierCurveTo(400, 250, 600, 280, 700, 350);
    ctx.bezierCurveTo(750, 400, 720, 500, 680, 550);
    ctx.bezierCurveTo(600, 580, 500, 560, 400, 520);
    ctx.bezierCurveTo(350, 480, 300, 420, 280, 350);
    ctx.closePath();
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.moveTo(450, 600);
    ctx.bezierCurveTo(500, 580, 520, 620, 530, 700);
    ctx.bezierCurveTo(520, 800, 500, 900, 480, 1000);
    ctx.bezierCurveTo(450, 1100, 420, 1200, 400, 1300);
    ctx.bezierCurveTo(380, 1200, 400, 1100, 420, 1000);
    ctx.bezierCurveTo(430, 900, 440, 800, 430, 700);
    ctx.bezierCurveTo(420, 620, 430, 580, 450, 600);
    ctx.closePath();
    ctx.fill();
    
    // Europe and Africa
    ctx.beginPath();
    ctx.ellipse(1200, 400, 200, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1150, 700, 180, 300, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia - large landmass
    ctx.beginPath();
    ctx.ellipse(2000, 450, 400, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(2200, 1200, 150, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add realistic mountain ranges
    const mountainGradient = ctx.createLinearGradient(0, 0, 0, 100);
    mountainGradient.addColorStop(0, '#78716c');
    mountainGradient.addColorStop(0.5, '#57534e');
    mountainGradient.addColorStop(1, '#44403c');
    ctx.fillStyle = mountainGradient;
    
    // Himalayas
    for (let i = 0; i < 15; i++) {
      const x = 1800 + Math.random() * 400;
      const y = 400 + Math.random() * 100;
      ctx.fillRect(x, y, 60 + Math.random() * 100, 25 + Math.random() * 40);
    }
    
    // Rocky Mountains
    for (let i = 0; i < 8; i++) {
      const x = 400 + Math.random() * 200;
      const y = 300 + Math.random() * 150;
      ctx.fillRect(x, y, 40 + Math.random() * 80, 20 + Math.random() * 30);
    }
    
    // Andes
    for (let i = 0; i < 10; i++) {
      const x = 420 + Math.random() * 60;
      const y = 600 + i * 80 + Math.random() * 40;
      ctx.fillRect(x, y, 30 + Math.random() * 50, 20 + Math.random() * 25);
    }
    
    // Add deserts with sandy color
    ctx.fillStyle = '#fbbf24';
    ctx.globalAlpha = 0.7;
    // Sahara
    ctx.fillRect(1000, 600, 300, 150);
    // Gobi
    ctx.fillRect(1900, 500, 200, 100);
    // Arabian
    ctx.fillRect(1400, 650, 150, 100);
    ctx.globalAlpha = 1.0;
    
    // Enhanced ice caps with realistic texture
    const iceGradient = ctx.createRadialGradient(2048, 100, 0, 2048, 100, 200);
    iceGradient.addColorStop(0, '#ffffff');
    iceGradient.addColorStop(0.7, '#f0f9ff');
    iceGradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = iceGradient;
    
    // Arctic ice cap
    ctx.fillRect(0, 0, 4096, 120);
    // Antarctic ice cap
    ctx.fillRect(0, 1920, 4096, 128);
    
    // Add ice texture details
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 4096;
      const y = Math.random() * 120;
      ctx.fillRect(x, y, 10 + Math.random() * 20, 3 + Math.random() * 8);
      // Antarctic
      const y2 = 1920 + Math.random() * 128;
      ctx.fillRect(x, y2, 10 + Math.random() * 20, 3 + Math.random() * 8);
    }
    
    // Add cloud shadows for atmosphere effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 4096;
      const y = Math.random() * 2048;
      const width = 100 + Math.random() * 300;
      const height = 30 + Math.random() * 80;
      ctx.beginPath();
      ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const earthTexture = new THREE.CanvasTexture(canvas);
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.wrapT = THREE.ClampToEdgeWrapping;

    return earthTexture;
  }
  
  function createEarthNormalMap() {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 1024;
    normalCanvas.height = 512;
    const normalCtx = normalCanvas.getContext('2d')!;
    
    normalCtx.fillStyle = '#8080ff'; // Neutral normal
    normalCtx.fillRect(0, 0, 1024, 512);
    
    // Add bump details for mountains and terrain
    normalCtx.fillStyle = '#a0a0ff';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const size = 5 + Math.random() * 15;
      normalCtx.fillRect(x, y, size, size);
    }
    
    return new THREE.CanvasTexture(normalCanvas);
  }
  
  function createEarthSpecularMap() {
    const specCanvas = document.createElement('canvas');
    specCanvas.width = 1024;
    specCanvas.height = 512;
    const specCtx = specCanvas.getContext('2d')!;
    
    specCtx.fillStyle = '#ffffff'; // Water reflects (white)
    specCtx.fillRect(0, 0, 1024, 512);
    
    specCtx.fillStyle = '#000000'; // Land doesn't reflect (black)
    // Approximate land masses
    specCtx.fillRect(150, 120, 180, 140); // North America
    specCtx.fillRect(200, 280, 80, 180);  // South America
    specCtx.fillRect(480, 200, 140, 200); // Africa
    specCtx.fillRect(600, 80, 200, 160);  // Asia
    specCtx.fillRect(720, 320, 80, 60);   // Australia
    
    return new THREE.CanvasTexture(specCanvas);
  }
  
  // Load cloud texture
  const [cloudTexture, setCloudTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/earth_clouds.jpg',
      (texture) => {
        if (isMounted) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          setCloudTexture(texture);
        }
      },
      undefined,
      () => { /* no clouds - fine */ }
    );
    return () => { isMounted = false; };
  }, []);

  const cloudRef = useRef<THREE.Mesh>(null);

  // Memoized atmosphere uniforms — thinned out so the surface is visible
  const earthOuterAtmosphereUniforms = useMemo(() => ({
    color: { value: new THREE.Color(0.3, 0.6, 1.0) },
    power: { value: 4.0 },
    intensity: { value: 0.6 },
    alphaScale: { value: 0.5 },
  }), []);

  const earthInnerAtmosphereUniforms = useMemo(() => ({
    color: { value: new THREE.Color(0.4, 0.7, 1.0) },
    power: { value: 6.0 },
    intensity: { value: 0.15 },
    alphaScale: { value: 0.25 },
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.PI * 0.3 + state.clock.elapsedTime * 0.005;
    }
    // Clouds rotate slightly faster than the surface
    if (cloudRef.current) {
      cloudRef.current.rotation.y = Math.PI * 0.3 + state.clock.elapsedTime * 0.007;
    }
  });

  return (
    <group>
      {/* Earth Surface with NASA satellite imagery */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[3.0, 256, 256]} />
        <meshStandardMaterial
          map={earthTexture}
          normalMap={earthNormalMap}
          normalScale={EARTH_NORMAL_SCALE}
          roughnessMap={earthSpecularMap}
          roughness={0.5}
          metalness={0.02}
          envMapIntensity={0.5}
          emissive={0x112244}
          emissiveIntensity={0.15}
        />
      </mesh>
      
      {/* Cloud layer */}
      {cloudTexture && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[3.04, 128, 64]} />
          <meshStandardMaterial
            map={cloudTexture}
            transparent
            opacity={0.35}
            depthWrite={false}
            roughness={1.0}
            metalness={0.0}
          />
        </mesh>
      )}

      {/* Fresnel atmosphere glow - thin outer rim */}
      <mesh scale={[1.04, 1.04, 1.04]}>
        <sphereGeometry args={[3.0, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          uniforms={earthOuterAtmosphereUniforms}
          vertexShader={FRESNEL_VERTEX_SHADER}
          fragmentShader={FRESNEL_FRAGMENT_SHADER}
        />
      </mesh>

      {/* Inner atmosphere - very subtle haze */}
      <mesh scale={[1.015, 1.015, 1.015]}>
        <sphereGeometry args={[3.0, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          uniforms={earthInnerAtmosphereUniforms}
          vertexShader={FRESNEL_VERTEX_SHADER}
          fragmentShader={FRESNEL_FRAGMENT_SHADER}
        />
      </mesh>
    </group>
  );
}

function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  // Sun corona shader material refs
  const coronaShaderRef = useRef<THREE.ShaderMaterial>(null);
  const outerCoronaShaderRef = useRef<THREE.ShaderMaterial>(null);

  // Memoized corona uniform objects to avoid per-render allocations
  const coronaUniforms = useMemo(() => ({
    time: { value: 0 },
    color1: { value: new THREE.Color(1.0, 0.85, 0.2) },
    color2: { value: new THREE.Color(1.0, 0.4, 0.0) },
    intensity: { value: 1.5 },
  }), []);

  const outerCoronaUniforms = useMemo(() => ({
    time: { value: 0 },
    color: { value: new THREE.Color(1.0, 0.5, 0.05) },
    intensity: { value: 0.6 },
  }), []);

  // Single consolidated useFrame for all Sun animations
  useFrame((state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.01;
    }
    if (coronaRef.current) {
      coronaRef.current.rotation.y -= delta * 0.005;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.015;
      coronaRef.current.scale.setScalar(scale);
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.003;
      // Scale pulsing handled by the outer corona shader's pulse uniform
    }
    if (coronaShaderRef.current) {
      coronaShaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    if (outerCoronaShaderRef.current) {
      outerCoronaShaderRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Sun body - HDR emissive for bloom */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[10, 128, 64]} />
        <meshStandardMaterial
          color={SUN_EMISSIVE_COLOR}
          emissive={SUN_EMISSIVE_COLOR}
          emissiveIntensity={2.0}
          roughness={1}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* Corona - inner layer with animated noise shader */}
      <mesh ref={coronaRef} scale={1.1}>
        <sphereGeometry args={[10, 64, 32]} />
        <shaderMaterial
          ref={coronaShaderRef}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          uniforms={coronaUniforms}
          vertexShader={FRESNEL_VERTEX_SHADER}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            varying vec2 vUv;
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform float intensity;

            // Simple noise function
            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
              vec2 i = floor(p);
              vec2 f = fract(p);
              f = f * f * (3.0 - 2.0 * f);
              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));
              return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            float fbm(vec2 p) {
              float v = 0.0;
              float a = 0.5;
              for (int i = 0; i < 4; i++) {
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
              }
              return v;
            }

            void main() {
              vec3 viewDir = normalize(cameraPosition - vWorldPosition);
              float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

              // Animated noise pattern
              float n = fbm(vUv * 8.0 + time * 0.15);
              float n2 = fbm(vUv * 4.0 - time * 0.1);
              float pattern = n * 0.6 + n2 * 0.4;

              vec3 col = mix(color1, color2, pattern);
              float alpha = fresnel * (0.5 + pattern * 0.5) * intensity;

              gl_FragColor = vec4(col * intensity, alpha * 0.4);
            }
          `}
        />
      </mesh>

      {/* Outer corona / solar wind - large diffuse glow */}
      <mesh ref={atmosphereRef} scale={1.35}>
        <sphereGeometry args={[10, 32, 16]} />
        <shaderMaterial
          ref={outerCoronaShaderRef}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          uniforms={outerCoronaUniforms}
          vertexShader={FRESNEL_VERTEX_SHADER}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            uniform float time;
            uniform vec3 color;
            uniform float intensity;
            void main() {
              vec3 viewDir = normalize(cameraPosition - vWorldPosition);
              float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 4.0);
              float pulse = 1.0 + sin(time * 0.5) * 0.15;
              gl_FragColor = vec4(color * intensity * pulse, fresnel * 0.2);
            }
          `}
        />
      </mesh>

      {/* Solar lighting system */}
      <pointLight
        position={[0, 0, 0]}
        intensity={10}
        color={0xFFF8DC}
        decay={2}
        distance={2500}
        castShadow={false}
      />

      {/* Secondary warm illumination */}
      <pointLight
        position={[0, 0, 0]}
        intensity={3}
        color={0xFFD700}
        decay={2}
        distance={1200}
        castShadow={false}
      />
    </group>
  );
}

// This component is now replaced by PlanetaryTrajectories

function EnhancedStarField() {
  const starFieldRef = useRef<THREE.Points>(null);
  
  const { starPositions, nebulaeData, twinklePhases } = useMemo(() => {
    // Enhanced star field with more variety
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    // Per-star random phases for twinkle animation
    const phases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      phases[i] = Math.random() * Math.PI * 2;
      const radius = 400 + Math.random() * 600;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // More realistic star color distribution
      const temp = Math.random();
      const brightness = 0.4 + Math.random() * 0.6;
      
      if (temp > 0.9) { // Blue giants (rare)
        colors[i * 3] = 0.7 * brightness; colors[i * 3 + 1] = 0.9 * brightness; colors[i * 3 + 2] = 1.0 * brightness;
        sizes[i] = 1.5 + Math.random() * 2;
      } else if (temp > 0.7) { // White stars
        colors[i * 3] = 1.0 * brightness; colors[i * 3 + 1] = 1.0 * brightness; colors[i * 3 + 2] = 0.95 * brightness;
        sizes[i] = 0.8 + Math.random() * 1.2;
      } else if (temp > 0.4) { // Yellow stars (like our Sun)
        colors[i * 3] = 1.0 * brightness; colors[i * 3 + 1] = 0.9 * brightness; colors[i * 3 + 2] = 0.7 * brightness;
        sizes[i] = 0.6 + Math.random() * 1;
      } else { // Red dwarfs (most common)
        colors[i * 3] = 1.0 * brightness; colors[i * 3 + 1] = 0.5 * brightness; colors[i * 3 + 2] = 0.3 * brightness;
        sizes[i] = 0.3 + Math.random() * 0.7;
      }
    }
    
    // Create nebula-like background clouds
    const nebulaePositions = new Float32Array(500 * 3);
    const nebulaeColors = new Float32Array(500 * 3);
    const nebulaeSizes = new Float32Array(500);
    
    for (let i = 0; i < 500; i++) {
      const radius = 800 + Math.random() * 400;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      
      nebulaePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      nebulaePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      nebulaePositions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Nebula colors (purple, blue, pink)
      const nebulaType = Math.random();
      if (nebulaType > 0.66) {
        nebulaeColors[i * 3] = 0.8; nebulaeColors[i * 3 + 1] = 0.3; nebulaeColors[i * 3 + 2] = 0.9; // Purple
      } else if (nebulaType > 0.33) {
        nebulaeColors[i * 3] = 0.3; nebulaeColors[i * 3 + 1] = 0.6; nebulaeColors[i * 3 + 2] = 1.0; // Blue
      } else {
        nebulaeColors[i * 3] = 1.0; nebulaeColors[i * 3 + 1] = 0.4; nebulaeColors[i * 3 + 2] = 0.7; // Pink
      }
      
      nebulaeSizes[i] = 20 + Math.random() * 40;
    }
    
    return {
      starPositions: { positions, colors, sizes },
      nebulaeData: { positions: nebulaePositions, colors: nebulaeColors, sizes: nebulaeSizes },
      twinklePhases: phases
    };
  }, []);

  // Store base sizes for twinkle modulation
  const baseSizes = useRef(new Float32Array(starPositions.sizes));

  useFrame((state) => {
    if (starFieldRef.current) {
      starFieldRef.current.rotation.y += 0.0001;

      // Twinkle animation: modulate star sizes over time
      const sizeAttr = starFieldRef.current.geometry.getAttribute('size');
      if (sizeAttr) {
        const t = state.clock.elapsedTime;
        const arr = sizeAttr.array as Float32Array;
        const base = baseSizes.current;
        for (let i = 0; i < STAR_COUNT; i++) {
          // Each star twinkles at its own frequency and phase
          const twinkle = 0.7 + 0.3 * Math.sin(t * (1.5 + (i % 7) * 0.3) + twinklePhases[i]);
          arr[i] = base[i] * twinkle;
        }
        sizeAttr.needsUpdate = true;
      }
    }
  });
  
  return (
    <group>
      {/* Main star field */}
      <points ref={starFieldRef}>
        <bufferGeometry>
          <bufferAttribute 
            attach="attributes-position" 
            args={[starPositions.positions, 3]} 
            count={STAR_COUNT} 
          />
          <bufferAttribute 
            attach="attributes-color" 
            args={[starPositions.colors, 3]} 
            count={STAR_COUNT} 
          />
          <bufferAttribute 
            attach="attributes-size" 
            args={[starPositions.sizes, 1]} 
            count={STAR_COUNT} 
          />
        </bufferGeometry>
        <pointsMaterial 
          size={1} 
          vertexColors 
          transparent 
          opacity={0.9}
          sizeAttenuation={true}
        />
      </points>
      
      {/* Nebula background */}
      <points>
        <bufferGeometry>
          <bufferAttribute 
            attach="attributes-position" 
            args={[nebulaeData.positions, 3]} 
            count={500} 
          />
          <bufferAttribute 
            attach="attributes-color" 
            args={[nebulaeData.colors, 3]} 
            count={500} 
          />
          <bufferAttribute 
            attach="attributes-size" 
            args={[nebulaeData.sizes, 1]} 
            count={500} 
          />
        </bufferGeometry>
        <pointsMaterial 
          size={1} 
          vertexColors 
          transparent 
          opacity={0.1}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// Individual asteroid component with realistic shapes and materials
function AsteroidSphere({ asteroid, index, isSelected, isHovered, onClick, onDoubleClick, onPointerOver, onPointerOut }: {
  asteroid: EnhancedAsteroid;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowTexture = useMemo(() => getGlowTexture(), []);
  const orbit = asteroid.orbit;
  const angle = orbit.phase;

  // Use actual asteroid distance from NASA API data
  // orbit.radius already contains the scaled distance (missDistance * 64)
  // Add minimum offset to ensure asteroids are always outside Earth's surface
  const earthRadius = 3.0; // Current Earth radius in visualization units
  const minDistance = earthRadius + 2.0; // Minimum distance from Earth center (Earth radius + 2 units buffer)
  const actualRadius = Math.max(minDistance, orbit.radius); // Ensure asteroid is always outside Earth
  
  const x = Math.cos(angle) * actualRadius;
  const z = Math.sin(angle) * actualRadius;
  const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;
  
  // Scale asteroids based on size and distance for better visibility
  const distanceFactor = Math.min(1.5, Math.max(0.5, 30 / actualRadius)); // Closer asteroids appear larger
  const baseScale = Math.max(0.1, Math.log10(Math.max(1, asteroid.size)) * 0.2) * distanceFactor;
  const scale = isSelected ? baseScale * 2.0 : isHovered ? baseScale * 1.5 : baseScale;
  
  const rarityColor = getRarity3DColor(asteroid.rarity);
  const color = new THREE.Color(rarityColor);
  
  // Create a slightly darker, more muted version for realism
  const baseColor = color.clone().multiplyScalar(0.7);
  
  // Add subtle color variation based on orbital position
  // Asteroids inside Earth's orbit (closer to Sun) get warmer tint
  // Asteroids outside Earth's orbit get cooler tint
  if (orbit.isInnerOrbit) {
    baseColor.lerp(new THREE.Color(0xffaa00), 0.1); // Slight orange tint
  } else {
    baseColor.lerp(new THREE.Color(0x0088ff), 0.05); // Slight blue tint
  }
  
  if (isSelected) {
    baseColor.lerp(new THREE.Color(0xffffff), 0.5);
  } else if (isHovered) {
    baseColor.lerp(new THREE.Color(0x00ffff), 0.3);
  }
  
  // Determine asteroid shape based on size and ID (for consistency)
  const shapeVariant = parseInt(asteroid.id, 10) % 4;
  const sizeCategory = asteroid.size < 0.5 ? 'small' : asteroid.size < 2.0 ? 'medium' : 'large';
  
  // Subtle rotation animation
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1 * (1 + parseInt(asteroid.id, 10) % 3);
      meshRef.current.rotation.y += delta * 0.05 * (1 + parseInt(asteroid.id, 10) % 2);
    }
  });
  
  // Different geometries for variety
  const getGeometry = () => {
    switch (shapeVariant) {
      case 0: // Irregular sphere (most common)
        return <sphereGeometry args={[1, 8, 6]} />;
      case 1: // Elongated (potato-shaped)
        return <sphereGeometry args={[1, 8, 6]} />;
      case 2: // More angular
        return <dodecahedronGeometry args={[1, 0]} />;
      case 3: // Very irregular
        return <icosahedronGeometry args={[1, 0]} />;
      default:
        return <sphereGeometry args={[1, 8, 6]} />;
    }
  };
  
  // Scale modifications for different shapes
  const getScaleModifications = (): [number, number, number] => {
    switch (shapeVariant) {
      case 1: // Elongated
        return [scale * 1.2, scale * 0.8, scale * 0.9];
      case 2: // Slightly flattened
        return [scale, scale * 0.7, scale];
      case 3: // Irregular
        return [scale * 1.1, scale * 0.9, scale * 1.05];
      default:
        return [scale, scale, scale];
    }
  };
  
  return (
    <group position={[x, y, z]}>
      <mesh
        ref={meshRef}
        scale={getScaleModifications()}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        castShadow
        receiveShadow
      >
        {getGeometry()}
        <meshStandardMaterial
          color={baseColor}
          roughness={0.85}
          metalness={0.15}
          transparent={false}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.5 : 0.15 + asteroid.rarity * 0.08}
        />
      </mesh>

      {/* Glow aura sprite */}
      <sprite scale={[scale * 4, scale * 4, 1]}>
        <spriteMaterial
          map={glowTexture}
          color={color}
          transparent
          opacity={isSelected ? 0.7 : isHovered ? 0.5 : 0.25 + asteroid.rarity * 0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>

      {/* 3D positioned tooltip */}
      {isHovered && (
        <Html position={[0, scale * 2, 0]} center style={{ zIndex: 10 }}>
          <div className="bg-black/90 text-white px-3 py-2 rounded-lg shadow-xl backdrop-blur-sm border border-white/20 pointer-events-none whitespace-nowrap">
            <div className="text-sm font-bold text-yellow-300">{asteroid.name}</div>
            <div className="text-xs text-gray-300 mt-1">
              Rarity: R{asteroid.rarity} | Size: {asteroid.size >= 1000 
                ? `${(asteroid.size / 1000).toFixed(2)} km`
                : `${asteroid.size.toFixed(1)} m`
              }
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Static asteroid field - NO FLASHING
function AsteroidField({ asteroids, onAsteroidSelect, selectedAsteroid, hoveredAsteroid, setHoveredAsteroid, onOpenDetailed, hideLabels }: { 
  asteroids: EnhancedAsteroid[]; 
  onAsteroidSelect?: (asteroid: EnhancedAsteroid | null) => void;
  selectedAsteroid?: EnhancedAsteroid | null;
  hoveredAsteroid?: number | null;
  setHoveredAsteroid?: (index: number | null) => void;
  onOpenDetailed?: () => void;
  hideLabels?: boolean;
}) {
  const { showTrajectories } = useAsteroidStore();

  return (
    <group>
      {/* Individual asteroid spheres */}
      {asteroids.map((asteroid, index) => (
        <AsteroidSphere
          key={asteroid.id}
          asteroid={asteroid}
          index={index}
          isSelected={selectedAsteroid?.id === asteroid.id}
          isHovered={hoveredAsteroid === index}
          onClick={() => {
            onAsteroidSelect?.(asteroid);
          }}
          onDoubleClick={() => {
            onAsteroidSelect?.(asteroid);
            onOpenDetailed?.();
          }}
          onPointerOver={() => {
            setHoveredAsteroid?.(index);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredAsteroid?.(null);
            document.body.style.cursor = 'auto';
          }}
        />
      ))}
      

      {/* Asteroid particle trails */}
      <AsteroidTrails asteroids={asteroids} />
      
      {/* Asteroid Names */}
      {selectedAsteroid && !hideLabels && (
        <AsteroidLabel asteroid={selectedAsteroid} />
      )}
      
      {/* Trajectory Lines - only for filtered asteroids */}
      {showTrajectories && (
        <group>
          {asteroids.slice(0, Math.min(5, asteroids.length)).map((asteroid, i) => (
            <TrajectoryLine key={asteroid.id} asteroid={asteroid} />
          ))}
        </group>
      )}
    </group>
  );
}

// Asteroid name label
function AsteroidLabel({ asteroid }: { asteroid: EnhancedAsteroid }) {
  const orbit = asteroid.orbit;
  const angle = orbit.phase;
  const actualRadius = orbit.radius; // Use actual distance
  
  const x = Math.cos(angle) * actualRadius;
  const z = Math.sin(angle) * actualRadius;
  const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;
  
  return (
    <Html position={[x, y + 2, z]} center style={{ zIndex: 10 }}>
      <div className="bg-black/80 text-white px-2 py-1 rounded text-xs pointer-events-none whitespace-nowrap">
        {asteroid.name}
      </div>
    </Html>
  );
}

// Particle trails for asteroids
function AsteroidTrails({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  const trailsRef = useRef<THREE.Points>(null);
  
  const trailData = useMemo(() => {
    const positions = new Float32Array(asteroids.length * 20 * 3); // 20 trail points per asteroid
    const colors = new Float32Array(asteroids.length * 20 * 3);
    const alphas = new Float32Array(asteroids.length * 20);
    
    asteroids.forEach((asteroid, asteroidIndex) => {
      const orbit = asteroid.orbit;
      const rarityColor = getRarity3DColor(asteroid.rarity);
      const rgb = parseInt(rarityColor.slice(1), 16);
      const baseColor = [(rgb >> 16) / 255, ((rgb >> 8) & 0xff) / 255, (rgb & 0xff) / 255];

      for (let i = 0; i < 20; i++) {
        const trailIndex = asteroidIndex * 20 + i;
        const angle = orbit.phase - (i * 0.05);

        const actualRadius = Math.max(5.0, orbit.radius);
        const x = Math.cos(angle) * actualRadius;
        const z = Math.sin(angle) * actualRadius;
        const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;

        positions[trailIndex * 3] = x;
        positions[trailIndex * 3 + 1] = y;
        positions[trailIndex * 3 + 2] = z;

        const alpha = (20 - i) / 20;
        colors[trailIndex * 3] = baseColor[0] * alpha;
        colors[trailIndex * 3 + 1] = baseColor[1] * alpha;
        colors[trailIndex * 3 + 2] = baseColor[2] * alpha;
        alphas[trailIndex] = alpha * 0.8;
      }
    });

    return { positions, colors, alphas };
  }, [asteroids]);

  // Memoize trail curves to avoid recreating geometry every render
  const trailCurves = useMemo(() => {
    return asteroids.map((asteroid) => {
      const orbit = asteroid.orbit;
      const trailPoints: THREE.Vector3[] = [];
      for (let i = 0; i < 20; i++) {
        const angle = orbit.phase - (i * 0.05);
        const actualRadius = Math.max(5.0, orbit.radius);
        trailPoints.push(new THREE.Vector3(
          Math.cos(angle) * actualRadius,
          Math.sin(angle * 0.2) * orbit.inclination * 0.15,
          Math.sin(angle) * actualRadius,
        ));
      }
      return {
        curve: trailPoints.length >= 2 ? new THREE.CatmullRomCurve3(trailPoints) : null,
        color: getRarity3DColor(asteroid.rarity),
        id: asteroid.id,
      };
    });
  }, [asteroids]);

  return (
    <group>
      {/* Smooth trail lines per asteroid */}
      {trailCurves.map((trail) => {
        if (!trail.curve) return null;
        return (
          <mesh key={trail.id}>
            <tubeGeometry args={[trail.curve, 32, 0.06, 6, false]} />
            <meshBasicMaterial
              color={trail.color}
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Fading particle halo at trail heads */}
      <points ref={trailsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trailData.positions, 3]}
            count={asteroids.length * 20}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[trailData.colors, 3]}
            count={asteroids.length * 20}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.2}
          vertexColors
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

function TrajectoryLine({ asteroid }: { asteroid: EnhancedAsteroid }) {
  const curve = useMemo(() => {
    const points = [];
    const orbit = asteroid.orbit;
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const actualRadius = orbit.radius;
      points.push(new THREE.Vector3(
        Math.cos(angle) * actualRadius,
        Math.sin(angle * 0.2) * orbit.inclination * 0.15,
        Math.sin(angle) * actualRadius,
      ));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [asteroid.orbit]);

  return (
    <mesh>
      <tubeGeometry args={[curve, 64, 0.05, 8, true]} />
      <meshBasicMaterial
        color={getRarity3DColor(asteroid.rarity)}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

// Enhanced Camera Controls Component
function CameraControls({ activePreset, onPresetChange, isTransitioning }: {
  activePreset: string;
  onPresetChange: (preset: string) => void;
  isTransitioning?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 pointer-events-auto">
      {/* Mobile: collapsed toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="md:hidden bg-black/60 backdrop-blur-sm rounded-lg p-2.5 border border-white/20 flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span className="text-white text-xs font-medium">{activePreset}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-white/60 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Mobile: expanded preset list */}
      {!isCollapsed && (
        <div className="md:hidden mt-1 bg-black/80 backdrop-blur-sm rounded-lg p-2 border border-white/20 max-w-[160px]">
          <div className="space-y-1">
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => { onPresetChange(preset.name); setIsCollapsed(true); }}
                disabled={isTransitioning}
                className={`w-full text-left px-2 py-2 rounded text-xs transition-all duration-200 min-h-[36px] ${
                  activePreset === preset.name
                    ? 'bg-blue-500/70 text-white shadow-sm'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="flex items-center gap-1.5">
                  {activePreset === preset.name && (
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                  )}
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop: always-visible panel */}
      <div className="hidden md:block bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/20 max-w-[180px]">
        <h3 className="text-white text-xs font-semibold mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          Camera Views
        </h3>
        <div className="space-y-1">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onPresetChange(preset.name)}
              disabled={isTransitioning}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all duration-200 ${
                activePreset === preset.name
                  ? 'bg-blue-500/70 text-white shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="flex items-center gap-1.5">
                {activePreset === preset.name && (
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                )}
                {preset.name}
              </span>
            </button>
          ))}
        </div>
        {isTransitioning && (
          <div className="mt-2 text-xs text-white/50 flex items-center gap-1.5">
            <div className="w-2 h-2 border border-white/30 border-t-white/80 rounded-full animate-spin"></div>
            <span className="text-[10px]">Transitioning...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Asteroid Info Panel
function AsteroidInfoPanel({ asteroid, onClose, onOpenDetailed }: { 
  asteroid: EnhancedAsteroid; 
  onClose: () => void;
  onOpenDetailed: () => void;
}) {
  const rarityInfo = getRarityInfo(asteroid.rarity);
  const riskBgColor = rarityInfo.bgColor;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="absolute bottom-2 left-2 right-2 md:left-auto md:bottom-4 md:right-4 z-10 bg-black/60 backdrop-blur-md rounded-xl p-3 md:p-5 md:max-w-sm border border-white/10 shadow-2xl pointer-events-auto"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white text-lg font-bold mb-1">{asteroid.name}</h3>
          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${riskBgColor}`}>
            <div className={`w-2 h-2 rounded-full bg-current animate-pulse ${rarityInfo.color}`}></div>
            <span className={rarityInfo.color}>
              R{asteroid.rarity} - {rarityInfo.level}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none p-1 hover:bg-white/10 rounded"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-3 text-white/80 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-white/60 text-xs uppercase tracking-wide">Physical Properties</div>
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-mono">
                {asteroid.size >= 1000 
                  ? `${(asteroid.size / 1000).toFixed(2)} km`
                  : `${asteroid.size.toFixed(1)} m`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rarity:</span>
              <span className={`font-mono font-medium ${rarityInfo.color}`}>
                {asteroid.rarity}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-white/60 text-xs uppercase tracking-wide">Orbital Data</div>
            <div className="flex justify-between">
              <span>Distance:</span>
              <span className="font-mono">{asteroid.missDistance.toFixed(2)} AU</span>
            </div>
            <div className="flex justify-between">
              <span>Velocity:</span>
              <span className="font-mono">{asteroid.velocity.toFixed(1)} km/s</span>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t border-white/10">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Next Approach</div>
          <div className="font-mono text-xs">
            {asteroid.close_approach_data[0]?.close_approach_date || 'Date unknown'}
          </div>
        </div>
        
        <button
          onClick={onOpenDetailed}
          className="w-full mt-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 hover:text-blue-200 py-2 px-4 rounded-lg transition-all duration-200 text-sm font-medium"
        >
          View Detailed Information
        </button>
      </div>
    </motion.div>
  );
}

// Inner scene component that drives animation via useFrame (no React re-renders)
function SolarSystemScene({
  asteroids, selectedAsteroid, onAsteroidSelect,
  hoveredAsteroid, setHoveredAsteroid,
  controlsRef, onOpenDetailed, showDetailedView
}: {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid?: EnhancedAsteroid | null;
  onAsteroidSelect?: (asteroid: EnhancedAsteroid | null) => void;
  hoveredAsteroid: number | null;
  setHoveredAsteroid: (id: number | null) => void;
  controlsRef: React.RefObject<any>;
  onOpenDetailed: () => void;
  showDetailedView: boolean;
}) {
  const timeRef = useRef(0);
  const earthPositionRef = useRef<[number, number, number]>([0, 0, 0]);
  const earthGroupRef = useRef<THREE.Group>(null);
  const [, forceUpdate] = useState(0);

  // Calculate initial Earth position
  const earthData = PLANET_DATA.find(p => p.name === 'Earth')!;
  const earthInitialAngle = (earthData.initialPhase || 0) * Math.PI * 2;

  // Drive animation from useFrame — no React state updates
  useFrame((_, delta) => {
    timeRef.current += delta * 0.2;
    const angle = earthInitialAngle + timeRef.current * earthData.speed;
    const x = Math.cos(angle) * earthData.distanceFromSun;
    const y = Math.sin(angle * 0.3) * earthData.inclination * 10;
    const z = Math.sin(angle) * earthData.distanceFromSun;
    earthPositionRef.current = [x, y, z];

    if (earthGroupRef.current) {
      earthGroupRef.current.position.set(x, y, z);
    }
    if (controlsRef.current) {
      if (selectedAsteroid) {
        // When an asteroid is selected, track its world position
        // (asteroid is a child of Earth group, so world pos = earth + local offset)
        const orbit = selectedAsteroid.orbit;
        const aAngle = orbit.phase;
        const minDist = 5.0; // earthRadius + buffer
        const aRadius = Math.max(minDist, orbit.radius);
        const ax = Math.cos(aAngle) * aRadius;
        const az = Math.sin(aAngle) * aRadius;
        const ay = Math.sin(aAngle * 0.2) * orbit.inclination * 0.15;
        controlsRef.current.target.set(x + ax, y + ay, z + az);
      } else {
        controlsRef.current.target.set(x, y, z);
      }
      controlsRef.current.update();
    }
  });

  const earthPos = earthPositionRef.current;

  return (
    <>
      <fog attach="fog" args={['#000011', 1500, 4000]} />
      <EnhancedStarField />

      {/* Balanced lighting */}
      <ambientLight intensity={0.5} color={0x506090} />
      <directionalLight
        position={[-earthPos[0], -earthPos[1], -earthPos[2]]}
        intensity={3.0}
        color={0xFDB813}
        castShadow={true}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={3000}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
      />
      <pointLight position={[0, 0, 0]} intensity={8} color={0xFDB813} decay={2} distance={1500} castShadow={false} />
      <hemisphereLight args={[0x87ceeb, 0x111122, 0.05]} />
      <directionalLight
        position={[earthPos[0] * 0.5, earthPos[1] + 30, earthPos[2] * 0.5]}
        intensity={0.4}
        color={0x4488ff}
        castShadow={false}
      />
      <pointLight position={[0, 50, 0]} intensity={1.2} color={0xffffff} decay={2} distance={200} castShadow={false} />

      <OrbitControls
        ref={controlsRef}
        target={earthPos}
        enablePan={true}
        enableZoom={true}
        minDistance={5}
        maxDistance={3000}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        panSpeed={0.8}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={Math.PI * 0.1}
      />

      <PlanetaryTrajectories />
      <Sun />

      {PLANET_DATA.filter(p => p.name !== 'Earth').map((planetData) => (
        <AnimatedPlanet key={planetData.name} planetData={planetData} earthInitialAngle={earthInitialAngle} timeRef={timeRef} hideLabels={showDetailedView} />
      ))}

      <group ref={earthGroupRef} position={earthPos}>
        <Earth />
        <Moon earthPosition={[0, 0, 0]} hideLabels={showDetailedView} />
        <AsteroidField
          asteroids={asteroids}
          onAsteroidSelect={onAsteroidSelect}
          selectedAsteroid={selectedAsteroid}
          hoveredAsteroid={hoveredAsteroid}
          setHoveredAsteroid={setHoveredAsteroid}
          onOpenDetailed={onOpenDetailed}
          hideLabels={showDetailedView}
        />
      </group>

    </>
  );
}

// Wrapper for Planet that reads time from a ref instead of prop (avoids React re-renders)
function AnimatedPlanet({ planetData, earthInitialAngle, timeRef, hideLabels }: { planetData: any; earthInitialAngle: number; timeRef: React.RefObject<number>; hideLabels?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const initialAngle = (planetData.initialPhase || 0) * Math.PI * 2;

  const planetTexture = useMemo(() =>
    createPlanetTexture(planetData.textureType, planetData.baseColor),
    [planetData.textureType, planetData.baseColor]
  );

  useFrame((_, delta) => {
    const time = timeRef.current;
    const angle = initialAngle + time * planetData.speed;
    const x = Math.cos(angle) * planetData.distanceFromSun;
    const z = Math.sin(angle) * planetData.distanceFromSun;
    const y = Math.sin(angle * 0.3) * planetData.inclination * 10;
    if (groupRef.current) groupRef.current.position.set(x, y, z);
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[planetData.size, 64, 32]} />
        <meshStandardMaterial
          map={planetTexture}
          roughness={planetData.textureType === 'iceGiant' ? 0.1 : 0.8}
          metalness={planetData.textureType === 'iceGiant' ? 0.3 : 0.1}
        />
      </mesh>
      {planetData.hasRings && (
        <>
          <mesh rotation={[Math.PI / 2.2, 0, 0]}>
            <ringGeometry args={[planetData.size * 1.2, planetData.size * 2.0, 64]} />
            <meshStandardMaterial color="#fad5a5" transparent opacity={0.7} roughness={0.9} />
          </mesh>
          <mesh rotation={[Math.PI / 2.2, 0, 0]}>
            <ringGeometry args={[planetData.size * 2.1, planetData.size * 2.8, 64]} />
            <meshStandardMaterial color="#e8c547" transparent opacity={0.5} roughness={0.9} />
          </mesh>
        </>
      )}
      {!hideLabels && (
        <Html position={[0, planetData.size + 3, 0]} center style={{ zIndex: 10 }}>
          <div className="bg-black/90 text-white px-3 py-1 rounded-lg text-sm font-medium pointer-events-none border border-white/20">
            {planetData.name}
          </div>
        </Html>
      )}
    </group>
  );
}

export function EnhancedSolarSystem({ asteroids, selectedAsteroid, onAsteroidSelect, hoveredAsteroid, setHoveredAsteroid }: Props) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [activePreset, setActivePreset] = useState('NEO Overview');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [internalHoveredAsteroid, setInternalHoveredAsteroid] = useState<number | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const controlsRef = useRef<any>(null);

  // Static initial Earth position (for camera init only)
  const earthData = PLANET_DATA.find(p => p.name === 'Earth')!;
  const earthInitialAngle = (earthData.initialPhase || 0) * Math.PI * 2;
  const earthPosition: [number, number, number] = [
    Math.cos(earthInitialAngle) * earthData.distanceFromSun,
    Math.sin(earthInitialAngle * 0.3) * earthData.inclination * 10,
    Math.sin(earthInitialAngle) * earthData.distanceFromSun
  ];
  
  // Use provided props or internal state
  const actualHoveredAsteroid = hoveredAsteroid ?? internalHoveredAsteroid;
  const actualSetHoveredAsteroid = setHoveredAsteroid || setInternalHoveredAsteroid;
  
  const handlePresetChange = async (presetName: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setActivePreset(presetName);
    
    const preset = CAMERA_PRESETS.find(p => p.name === presetName);
    if (preset && controlsRef.current) {
      const startPos = controlsRef.current.object.position.clone();
      const startTarget = controlsRef.current.target.clone();
      
      // Position camera relative to Earth's position
      const endPos = new THREE.Vector3(
        earthPosition[0] + preset.position[0],
        earthPosition[1] + preset.position[1], 
        earthPosition[2] + preset.position[2]
      );
      const endTarget = new THREE.Vector3(
        earthPosition[0] + preset.target[0],
        earthPosition[1] + preset.target[1],
        earthPosition[2] + preset.target[2]
      );
      
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        controlsRef.current.object.position.lerpVectors(startPos, endPos, eased);
        controlsRef.current.target.lerpVectors(startTarget, endTarget, eased);
        controlsRef.current.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
        }
      };
      
      animate();
    }
  };

  // Fly camera to selected asteroid when selection changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const newId = selectedAsteroid?.id ?? null;
    if (newId === prevSelectedRef.current) return;
    prevSelectedRef.current = newId;

    if (!selectedAsteroid || !controlsRef.current || isTransitioning) return;

    // Calculate asteroid's local position (relative to Earth group)
    const orbit = selectedAsteroid.orbit;
    const angle = orbit.phase;
    const earthRadius = 3.0;
    const minDistance = earthRadius + 2.0;
    const actualRadius = Math.max(minDistance, orbit.radius);

    const ax = Math.cos(angle) * actualRadius;
    const az = Math.sin(angle) * actualRadius;
    const ay = Math.sin(angle * 0.2) * orbit.inclination * 0.15;

    // World position = current Earth position + asteroid offset
    const controls = controlsRef.current;
    const currentTarget = controls.target.clone(); // Earth's current world pos
    const asteroidWorld = new THREE.Vector3(
      currentTarget.x + ax,
      currentTarget.y + ay,
      currentTarget.z + az
    );

    // Camera offset: position the camera at a comfortable viewing distance from the asteroid
    const viewDist = Math.max(8, actualRadius * 0.3);
    const camOffset = new THREE.Vector3(ax, ay + viewDist * 0.5, az).normalize().multiplyScalar(viewDist);

    const startPos = controls.object.position.clone();
    const startTarget = controls.target.clone();
    const endPos = asteroidWorld.clone().add(camOffset);
    const endTarget = asteroidWorld.clone();

    setIsTransitioning(true);
    const duration = 1200;
    const startTime = Date.now();

    const animateFlyTo = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      controls.object.position.lerpVectors(startPos, endPos, eased);
      controls.target.lerpVectors(startTarget, endTarget, eased);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateFlyTo);
      } else {
        setIsTransitioning(false);
      }
    };

    animateFlyTo();
  }, [selectedAsteroid, isTransitioning, earthPosition]);

  return (
    <div className="w-full h-full bg-gradient-to-b from-space-dark via-blue-900/20 to-space-dark relative overflow-hidden">
      <Canvas
        camera={{ position: [earthPosition[0] + 0, earthPosition[1] + 100, earthPosition[2] + 150], fov: 60 }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.NoToneMapping,
        }}
        raycaster={{ 
          params: { 
            Points: { threshold: 0.5 },
            Mesh: { threshold: 0.5 },
            Line: { threshold: 0.5 },
            LOD: { threshold: 0.5 },
            Sprite: { threshold: 0.5 }
          } 
        }}
        style={{ cursor: 'auto' }}
        onPointerMissed={() => {
          if (actualSetHoveredAsteroid) {
            actualSetHoveredAsteroid(null);
          }
          document.body.style.cursor = 'auto';
        }}
      >
        <Suspense fallback={null}>
          <SolarSystemScene
            asteroids={asteroids}
            selectedAsteroid={selectedAsteroid}
            onAsteroidSelect={onAsteroidSelect}
            hoveredAsteroid={actualHoveredAsteroid}
            setHoveredAsteroid={actualSetHoveredAsteroid}
            controlsRef={controlsRef}
            onOpenDetailed={() => setShowDetailedView(true)}
            showDetailedView={showDetailedView}
          />
          <PostProcessingEffects isMobile={isMobile} />
        </Suspense>
      </Canvas>
      
      <CameraControls 
        activePreset={activePreset} 
        onPresetChange={handlePresetChange}
        isTransitioning={isTransitioning}
      />
      
      {selectedAsteroid && (
        <AsteroidInfoPanel 
          asteroid={selectedAsteroid} 
          onClose={() => onAsteroidSelect?.(null)}
          onOpenDetailed={() => setShowDetailedView(true)}
        />
      )}
      
      {selectedAsteroid && (
        <DetailedAsteroidView
          asteroid={selectedAsteroid}
          isOpen={showDetailedView}
          onClose={() => setShowDetailedView(false)}
        />
      )}
      
      {/* Asteroid List Panel */}
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="hidden md:block absolute right-4 top-24 bottom-24 w-80 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white text-lg font-bold">Nearby Asteroids</h3>
          <p className="text-white/60 text-xs mt-1">Click to select • Hover to highlight</p>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-80px)] custom-scrollbar">
          <div className="p-2 space-y-1">
            {asteroids.map((asteroid, index) => {
              const rarityInfo = getRarityInfo(asteroid.rarity);
              const isSelected = selectedAsteroid?.id === asteroid.id;
              const isHovered = actualHoveredAsteroid === index;
              
              return (
                <motion.button
                  key={asteroid.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                  onClick={() => onAsteroidSelect?.(asteroid)}
                  onMouseEnter={() => actualSetHoveredAsteroid(index)}
                  onMouseLeave={() => actualSetHoveredAsteroid(null)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-500/30 border border-blue-400/50' 
                      : isHovered
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{asteroid.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full bg-current ${rarityInfo.color} ${isSelected || isHovered ? 'animate-pulse' : ''}`}></div>
                        <span className={`text-xs ${rarityInfo.color}`}>
                          R{asteroid.rarity}
                        </span>
                        <span className="text-white/40 text-xs">•</span>
                        <span className="text-white/60 text-xs">
                          {asteroid.size >= 1000 
                            ? `${(asteroid.size / 1000).toFixed(2)} km`
                            : `${asteroid.size.toFixed(1)} m`
                          }
                        </span>
                      </div>
                    </div>
                    {(isSelected || isHovered) && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-2"
                      >
                        <div className="w-4 h-4 rounded-full bg-blue-400/30 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div className="text-white/40 text-xs mt-1">
                    {asteroid.velocity.toFixed(1)} km/s • {asteroid.missDistance.toFixed(2)} AU
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>

      
      <div className="absolute bottom-2 md:bottom-4 right-4 z-10 text-xs text-white/40">
        Asteroids: {asteroids.length}
      </div>
      
      {/* Mobile Asteroid List Toggle */}
      <button
        onClick={() => setShowDetailedView(!showDetailedView)}
        className="md:hidden fixed bottom-[4.5rem] right-4 z-20 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      </button>

      {/* Mobile Asteroid List Drawer */}
      {showDetailedView && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-black/90 backdrop-blur-lg rounded-t-2xl border-t border-white/20 max-h-[70vh]"
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-bold">Nearby Asteroids</h3>
              <button
                onClick={() => setShowDetailedView(false)}
                className="text-white/60 hover:text-white p-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto h-[calc(100%-80px)] custom-scrollbar p-4">
            <div className="space-y-2">
              {asteroids.map((asteroid) => {
                const rarityInfo = getRarityInfo(asteroid.rarity);
                const isSelected = selectedAsteroid?.id === asteroid.id;
                const isHovered = actualHoveredAsteroid === parseInt(asteroid.id);
                
                return (
                  <motion.button
                    key={asteroid.id}
                    onClick={() => {
                      if (onAsteroidSelect) {
                        onAsteroidSelect(asteroid);
                      }
                      setShowDetailedView(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-purple-900/50 border-purple-500' 
                        : isHovered
                        ? 'bg-white/10 border-white/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">{asteroid.name}</div>
                        <div className="text-white/60 text-xs">
                          {asteroid.size.toFixed(1)} m • {asteroid.velocity.toFixed(1)} km/s
                        </div>
                      </div>
                      <div className={`${rarityInfo.bgColor} px-2 py-1 rounded-full`}>
                        <span className={`text-xs font-medium ${rarityInfo.color}`}>
                          R{asteroid.rarity}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Risk Legend */}
      <RiskLegend position="center" />
    </div>
  );
}