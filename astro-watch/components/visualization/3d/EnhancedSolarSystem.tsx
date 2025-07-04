'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera, Html } from '@react-three/drei';
import { Suspense, useRef, useState, useMemo, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/three';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { EnhancedAsteroid } from '@/lib/nasa-api';
import { useAsteroidStore } from '@/lib/store';

interface Props {
  asteroids: EnhancedAsteroid[];
  selectedAsteroid?: EnhancedAsteroid | null;
  onAsteroidSelect?: (asteroid: EnhancedAsteroid | null) => void;
}

interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Solar System View', position: [0, 30, 80], target: [0, 0, 0] },
  { name: 'Earth Close-up', position: [0, 10, 20], target: [0, 0, 0] },
  { name: 'Asteroid Chase', position: [50, 20, 50], target: [0, 0, 0] },
  { name: 'Top Down', position: [0, 100, 0], target: [0, 0, 0] }
];

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Earth texture state that can be updated
  const [earthTexture, setEarthTexture] = useState<THREE.Texture>(() => createProceduralEarthTexture());
  
  // Try to load NASA texture on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loader = new THREE.TextureLoader();
    loader.load(
      '/textures/earth_day.jpg',
      (texture) => {
        // Success callback - NASA texture loaded
        if (isMounted) {
          console.log('✅ NASA Earth texture loaded successfully');
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          // Update the texture state
          setEarthTexture(texture);
        }
      },
      undefined,
      (error) => {
        // Error callback - NASA texture failed to load
        if (isMounted) {
          console.log('⚠️ NASA texture not found, using procedural texture');
          console.log('To add realistic textures, run: ./scripts/download-textures.sh');
        }
      }
    );
    
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
  
  // Procedural texture creation (fallback)
  function createProceduralEarthTexture() {
    // Main Earth texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Create realistic ocean base with depth
    const oceanGradient = ctx.createRadialGradient(1024, 512, 0, 1024, 512, 512);
    oceanGradient.addColorStop(0, '#2563eb');
    oceanGradient.addColorStop(0.5, '#1d4ed8');
    oceanGradient.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, 2048, 1024);
    
    // Add more detailed continents with realistic coastlines
    ctx.fillStyle = '#059669';
    
    // North America with more detail
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.bezierCurveTo(250, 180, 350, 190, 400, 220);
    ctx.bezierCurveTo(420, 280, 380, 320, 350, 350);
    ctx.bezierCurveTo(300, 340, 250, 330, 200, 300);
    ctx.closePath();
    ctx.fill();
    
    // Add more continents with curves
    ctx.beginPath();
    ctx.ellipse(600, 300, 150, 100, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia
    ctx.beginPath();
    ctx.ellipse(1200, 250, 200, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add mountain ranges with gradients
    const mountainGradient = ctx.createLinearGradient(0, 0, 0, 50);
    mountainGradient.addColorStop(0, '#8B4513');
    mountainGradient.addColorStop(1, '#654321');
    ctx.fillStyle = mountainGradient;
    
    // Mountain ranges
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 2048;
      const y = 200 + Math.random() * 400;
      ctx.fillRect(x, y, 40 + Math.random() * 60, 15 + Math.random() * 25);
    }
    
    // Ice caps with realistic shapes
    const iceGradient = ctx.createRadialGradient(1024, 50, 0, 1024, 50, 100);
    iceGradient.addColorStop(0, '#ffffff');
    iceGradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = iceGradient;
    ctx.fillRect(0, 0, 2048, 80);
    ctx.fillRect(0, 940, 2048, 84);
    
    const earthTexture = new THREE.CanvasTexture(canvas);
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Create normal map for surface details
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 1024;
    normalCanvas.height = 512;
    const normalCtx = normalCanvas.getContext('2d')!;
    
    normalCtx.fillStyle = '#8080ff'; // Neutral normal
    normalCtx.fillRect(0, 0, 1024, 512);
    
    // Add bump details for mountains
    normalCtx.fillStyle = '#a0a0ff';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      normalCtx.fillRect(x, y, 10, 10);
    }
    
    const earthNormalMap = new THREE.CanvasTexture(normalCanvas);
    
    // Create specular map (water reflects, land doesn't)
    const specCanvas = document.createElement('canvas');
    specCanvas.width = 1024;
    specCanvas.height = 512;
    const specCtx = specCanvas.getContext('2d')!;
    
    specCtx.fillStyle = '#ffffff'; // Water reflects
    specCtx.fillRect(0, 0, 1024, 512);
    
    specCtx.fillStyle = '#000000'; // Land doesn't reflect
    // Copy land masses as black areas
    specCtx.fillRect(150, 120, 180, 140);
    specCtx.fillRect(200, 280, 80, 180);
    specCtx.fillRect(480, 200, 140, 200);
    
    const earthSpecularMap = new THREE.CanvasTexture(specCanvas);
    
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
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.005; // Very slow Earth rotation
    }
  });

  return (
    <group>
      {/* Earth Surface with NASA satellite imagery */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[6.371, 256, 256]} />
        <meshStandardMaterial
          map={earthTexture}
          normalMap={earthNormalMap}
          normalScale={new THREE.Vector2(0.2, 0.2)}
          roughnessMap={earthSpecularMap}
          roughness={0.7}
          metalness={0.02}
          envMapIntensity={0.3}
        />
      </mesh>
      
      {/* Subtle single atmosphere layer */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[6.371, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0x87ceeb)}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1;
    }
  });
  
  return (
    <group position={[120, 0, 0]}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial 
          color={new THREE.Color(0xFDB813)}
        />
      </mesh>
    </group>
  );
}

function EnhancedStarField() {
  const starFieldRef = useRef<THREE.Points>(null);
  
  const { starPositions, nebulaeData } = useMemo(() => {
    // Enhanced star field with more variety
    const positions = new Float32Array(8000 * 3);
    const colors = new Float32Array(8000 * 3);
    const sizes = new Float32Array(8000);
    
    for (let i = 0; i < 8000; i++) {
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
      nebulaeData: { positions: nebulaePositions, colors: nebulaeColors, sizes: nebulaeSizes }
    };
  }, []);
  
  useFrame((state) => {
    if (starFieldRef.current) {
      starFieldRef.current.rotation.y += 0.0001;
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
            count={8000} 
          />
          <bufferAttribute 
            attach="attributes-color" 
            args={[starPositions.colors, 3]} 
            count={8000} 
          />
          <bufferAttribute 
            attach="attributes-size" 
            args={[starPositions.sizes, 1]} 
            count={8000} 
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

// Static asteroid field - NO FLASHING
function AsteroidField({ asteroids, onAsteroidSelect, selectedAsteroid }: { 
  asteroids: EnhancedAsteroid[]; 
  onAsteroidSelect?: (asteroid: EnhancedAsteroid | null) => void;
  selectedAsteroid?: EnhancedAsteroid | null;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { showTrajectories } = useAsteroidStore();
  const [hoveredAsteroid, setHoveredAsteroid] = useState<number | null>(null);
  
  // Initialize positions and colors based on filtered asteroids
  useEffect(() => {
    if (!meshRef.current || asteroids.length === 0) return;
    
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    
    // Clear all instances first
    for (let i = 0; i < meshRef.current.count; i++) {
      tempObject.position.set(0, 0, 0);
      tempObject.scale.setScalar(0); // Hide unused instances
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      
      tempColor.setHex(0x000000);
      meshRef.current.setColorAt(i, tempColor);
    }
    
    // Only render filtered asteroids
    asteroids.forEach((asteroid, i) => {
      if (i >= meshRef.current!.count) return;
      
      const orbit = asteroid.orbit;
      
      // STATIC position - NO ANIMATION
      const angle = orbit.phase;
      
      // Ensure asteroids are OUTSIDE Earth (radius = 6.371)
      const minDistance = 12; // Safe distance from Earth
      const actualRadius = Math.max(minDistance, orbit.radius);
      
      const x = Math.cos(angle) * actualRadius;
      const z = Math.sin(angle) * actualRadius;
      const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;
      
      tempObject.position.set(x, y, z);
      
      // STATIC scale
      const baseScale = Math.max(0.3, Math.log10(Math.max(1, asteroid.size)) * 0.4);
      tempObject.scale.setScalar(baseScale);
      
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // STATIC color - only based on risk level
      const baseColorHex = asteroid.risk > 0.7 ? 0xff3333 : 
                         asteroid.risk > 0.4 ? 0xffaa00 : 0x33ff33;
      
      tempColor.setHex(baseColorHex);
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current!.instanceMatrix.needsUpdate = true;
    if (meshRef.current!.instanceColor) {
      meshRef.current!.instanceColor.needsUpdate = true;
    }
  }, [asteroids]);
  
  // Handle selection highlighting and hover effects
  useFrame(() => {
    if (!meshRef.current || asteroids.length === 0) return;
    
    const tempColor = new THREE.Color();
    const tempObject = new THREE.Object3D();
    let needsColorUpdate = false;
    let needsMatrixUpdate = false;
    
    asteroids.forEach((asteroid, i) => {
      if (i >= meshRef.current!.count) return;
      
      // Base color
      const baseColorHex = asteroid.risk > 0.7 ? 0xff3333 : 
                         asteroid.risk > 0.4 ? 0xffaa00 : 0x33ff33;
      
      tempColor.setHex(baseColorHex);
      
      // Get current matrix for scale manipulation
      meshRef.current!.getMatrixAt(i, tempObject.matrix);
      tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);
      
      const baseScale = Math.max(0.3, Math.log10(Math.max(1, asteroid.size)) * 0.4);
      
      // Only highlight selected/hovered
      if (selectedAsteroid?.id === asteroid.id) {
        tempColor.lerp(new THREE.Color(0xffffff), 0.7); // More pronounced selection
        tempObject.scale.setScalar(baseScale * 1.5); // Larger scale for selection
        needsColorUpdate = true;
        needsMatrixUpdate = true;
      } else if (hoveredAsteroid === i) {
        tempColor.lerp(new THREE.Color(0x00ffff), 0.8); // More pronounced hover - cyan
        tempObject.scale.setScalar(baseScale * 1.3); // Slightly larger for hover
        needsColorUpdate = true;
        needsMatrixUpdate = true;
      } else {
        tempObject.scale.setScalar(baseScale); // Normal scale
        needsMatrixUpdate = true;
      }
      
      if (needsMatrixUpdate) {
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
      }
      
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    if (needsColorUpdate && meshRef.current!.instanceColor) {
      meshRef.current!.instanceColor.needsUpdate = true;
    }
    if (needsMatrixUpdate) {
      meshRef.current!.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, Math.max(100, asteroids.length)]}
        onClick={(e) => {
          e.stopPropagation();
          if (onAsteroidSelect && e.instanceId !== undefined && e.instanceId < asteroids.length) {
            const selectedAst = asteroids[e.instanceId];
            onAsteroidSelect(selectedAst);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined && e.instanceId < asteroids.length) {
            setHoveredAsteroid(e.instanceId);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredAsteroid(null);
          document.body.style.cursor = 'default';
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId !== undefined && e.instanceId < asteroids.length) {
            if (hoveredAsteroid !== e.instanceId) {
              setHoveredAsteroid(e.instanceId);
              document.body.style.cursor = 'pointer';
            }
          }
        }}
        frustumCulled={false}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          roughness={0.9}
          metalness={0.3}
          color={0x8B4513}
          transparent={false}
          side={THREE.FrontSide}
        />
      </instancedMesh>
      
      {/* Asteroid particle trails */}
      <AsteroidTrails asteroids={asteroids} />
      
      {/* Asteroid Names */}
      {selectedAsteroid && (
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
  const minDistance = 12;
  const actualRadius = Math.max(minDistance, orbit.radius);
  
  const x = Math.cos(angle) * actualRadius;
  const z = Math.sin(angle) * actualRadius;
  const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;
  
  return (
    <Html position={[x, y + 2, z]} center>
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
      const baseColor = asteroid.risk > 0.7 ? [1, 0.2, 0.2] : 
                       asteroid.risk > 0.4 ? [1, 0.7, 0] : [0.2, 1, 0.2];
      
      for (let i = 0; i < 20; i++) {
        const trailIndex = asteroidIndex * 20 + i;
        const angle = orbit.phase - (i * 0.05); // Trail behind the asteroid
        
        const minDistance = 12;
        const actualRadius = Math.max(minDistance, orbit.radius);
        const x = Math.cos(angle) * actualRadius;
        const z = Math.sin(angle) * actualRadius;
        const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;
        
        positions[trailIndex * 3] = x;
        positions[trailIndex * 3 + 1] = y;
        positions[trailIndex * 3 + 2] = z;
        
        // Fade trail from bright to transparent
        const alpha = (20 - i) / 20;
        colors[trailIndex * 3] = baseColor[0] * alpha;
        colors[trailIndex * 3 + 1] = baseColor[1] * alpha;
        colors[trailIndex * 3 + 2] = baseColor[2] * alpha;
        alphas[trailIndex] = alpha * 0.8;
      }
    });
    
    return { positions, colors, alphas };
  }, [asteroids]);
  
  return (
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
        size={0.3} 
        vertexColors 
        transparent 
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function TrajectoryLine({ asteroid }: { asteroid: EnhancedAsteroid }) {
  const points = [];
  const orbit = asteroid.orbit;
  
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const minDistance = 12;
    const actualRadius = Math.max(minDistance, orbit.radius);
    const x = Math.cos(angle) * actualRadius;
    const z = Math.sin(angle) * actualRadius;
    const y = Math.sin(angle * 0.2) * orbit.inclination * 0.15;
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return (
    <mesh>
      <tubeGeometry 
        args={[
          new THREE.CatmullRomCurve3(points),
          64,
          0.05,
          8,
          true
        ]} 
      />
      <meshBasicMaterial 
        color={asteroid.risk > 0.7 ? '#ff3b30' : asteroid.risk > 0.4 ? '#ff9500' : '#34c759'}
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
  return (
    <div className="absolute top-4 right-4 z-10 bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
      <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
        Camera Views
      </h3>
      <div className="space-y-2">
        {CAMERA_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onPresetChange(preset.name)}
            disabled={isTransitioning}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              activePreset === preset.name 
                ? 'bg-blue-500/80 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-white/5 text-white/80 hover:bg-white/15 hover:text-white'
            } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="flex items-center gap-2">
              {activePreset === preset.name && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
              {preset.name}
            </span>
          </button>
        ))}
      </div>
      {isTransitioning && (
        <div className="mt-3 text-xs text-white/60 flex items-center gap-2">
          <div className="w-3 h-3 border border-white/30 border-t-white/80 rounded-full animate-spin"></div>
          Transitioning...
        </div>
      )}
    </div>
  );
}

// Enhanced Asteroid Info Panel
function AsteroidInfoPanel({ asteroid, onClose }: { 
  asteroid: EnhancedAsteroid; 
  onClose: () => void;
}) {
  const riskColor = asteroid.risk > 0.7 ? 'red' : asteroid.risk > 0.4 ? 'yellow' : 'green';
  const riskBgColor = asteroid.risk > 0.7 ? 'bg-red-500/20' : asteroid.risk > 0.4 ? 'bg-yellow-500/20' : 'bg-green-500/20';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="absolute bottom-4 left-4 z-10 bg-black/40 backdrop-blur-md rounded-xl p-5 max-w-sm border border-white/10 shadow-2xl"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white text-lg font-bold mb-1">{asteroid.name}</h3>
          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${riskBgColor}`}>
            <div className={`w-2 h-2 rounded-full ${
              riskColor === 'red' ? 'bg-red-400' : 
              riskColor === 'yellow' ? 'bg-yellow-400' : 'bg-green-400'
            } animate-pulse`}></div>
            <span className={`${
              riskColor === 'red' ? 'text-red-300' : 
              riskColor === 'yellow' ? 'text-yellow-300' : 'text-green-300'
            }`}>
              {asteroid.risk > 0.7 ? 'HIGH RISK' : asteroid.risk > 0.4 ? 'MEDIUM RISK' : 'LOW RISK'}
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
              <span className="font-mono">{asteroid.size.toFixed(1)} km</span>
            </div>
            <div className="flex justify-between">
              <span>Risk:</span>
              <span className={`font-mono font-medium ${
                riskColor === 'red' ? 'text-red-400' : 
                riskColor === 'yellow' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {(asteroid.risk * 100).toFixed(1)}%
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
      </div>
    </motion.div>
  );
}

export function EnhancedSolarSystem({ asteroids, selectedAsteroid, onAsteroidSelect }: Props) {
  const [activePreset, setActivePreset] = useState('Solar System View');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const controlsRef = useRef<any>(null);
  
  const handlePresetChange = async (presetName: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setActivePreset(presetName);
    
    const preset = CAMERA_PRESETS.find(p => p.name === presetName);
    if (preset && controlsRef.current) {
      const startPos = controlsRef.current.object.position.clone();
      const startTarget = controlsRef.current.target.clone();
      const endPos = new THREE.Vector3(...preset.position);
      const endTarget = new THREE.Vector3(...preset.target);
      
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
  
  return (
    <div className="w-full h-full bg-gradient-to-b from-space-dark via-blue-900/20 to-space-dark relative">
      <Canvas 
        camera={{ position: [0, 20, 50], fov: 60 }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#000011', 400, 1000]} />
          
          <EnhancedStarField />
          
          {/* Realistic space lighting setup */}
          <ambientLight intensity={0.15} color={0x404080} />
          
          {/* Main sunlight - strong directional */}
          <directionalLight 
            position={[120, 60, 30]} 
            intensity={2.5} 
            color={0xFDB813}
            castShadow={true}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.1}
            shadow-camera-far={1000}
            shadow-camera-left={-100}
            shadow-camera-right={100}
            shadow-camera-top={100}
            shadow-camera-bottom={-100}
          />
          
          {/* Sun's point light for close illumination */}
          <pointLight 
            position={[120, 0, 0]} 
            intensity={3} 
            color={0xFDB813} 
            decay={2}
            distance={800}
            castShadow={false}
          />
          
          {/* Starlight hemisphere lighting */}
          <hemisphereLight 
            args={[0x87ceeb, 0x111122, 0.05]}
          />
          
          {/* Rim lighting for dramatic effect */}
          <directionalLight 
            position={[-50, 30, -50]} 
            intensity={0.8} 
            color={0x4488ff}
            castShadow={false}
          />
          
          <OrbitControls 
            ref={controlsRef}
            enablePan={true} 
            enableZoom={true} 
            minDistance={8}
            maxDistance={300}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.5}
            zoomSpeed={1.2}
            panSpeed={0.8}
            maxPolarAngle={Math.PI * 0.9}
            minPolarAngle={Math.PI * 0.1}
          />
          
          <Earth />
          <Sun />
          <AsteroidField 
            asteroids={asteroids} 
            onAsteroidSelect={onAsteroidSelect}
            selectedAsteroid={selectedAsteroid}
          />
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
        />
      )}
      
      <div className="absolute bottom-4 right-4 z-10 text-xs text-white/40">
        Asteroids: {asteroids.length}
      </div>
    </div>
  );
}