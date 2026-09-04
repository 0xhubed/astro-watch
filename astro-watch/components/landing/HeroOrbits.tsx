'use client';

/**
 * Landing hero background — a particle Earth, tilted orbit rings with
 * traveling asteroid nodes, and a distant starfield, rendered in R3F.
 *
 * Technique adapted from the ThreeUI catalog examples (Orbital Sphere /
 * Orbital Dust: fibonacci-sphere point clouds, additive blending, pointer
 * parallax), re-implemented natively on the project's three/R3F stack with
 * the AstroWatch palette (indigo globe, amber asteroids). Static single
 * frame when the user prefers reduced motion.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const GLOBE_RADIUS = 2.2;
const GLOBE_PARTICLES = 9000;
const STAR_COUNT = 1600;

function ParticleGlobe() {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(GLOBE_PARTICLES * 3);
    const colors = new Float32Array(GLOBE_PARTICLES * 3);
    const dim = new THREE.Color('#312e81');
    const bright = new THREE.Color('#a5b4fc');
    let valid = 0;
    // Fibonacci sphere with a noise mask — the filtered bands read as
    // continents without needing a texture.
    for (let i = 0; i < GLOBE_PARTICLES; i++) {
      const phi = Math.acos(-1 + (2 * i) / GLOBE_PARTICLES);
      const theta = Math.sqrt(GLOBE_PARTICLES * Math.PI) * phi;
      const x = GLOBE_RADIUS * Math.cos(theta) * Math.sin(phi);
      const y = GLOBE_RADIUS * Math.sin(theta) * Math.sin(phi);
      const z = GLOBE_RADIUS * Math.cos(phi);
      const noise = Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5) + Math.cos(x * 6) * 0.4;
      if (noise <= -0.1) continue;
      const distortion = 1 + noise * 0.1;
      positions[valid * 3] = x * distortion;
      positions[valid * 3 + 1] = y * distortion;
      positions[valid * 3 + 2] = z * distortion;
      const c = dim.clone().lerp(bright, noise > 0.5 ? 1 : 0.3);
      colors[valid * 3] = c.r;
      colors[valid * 3 + 1] = c.g;
      colors[valid * 3 + 2] = c.b;
      valid++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, valid * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, valid * 3), 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.018}
          vertexColors
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

interface OrbitRingProps {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  nodeAngle: number;
  nodeColor: string;
}

function OrbitRing({ radius, tilt, speed, nodeAngle, nodeColor }: OrbitRingProps) {
  const nodeCarrierRef = useRef<THREE.Group>(null);

  const lineObj = useMemo(() => {
    const pts: number[] = [];
    for (let p = 0; p <= 128; p++) {
      const a = (p / 128) * Math.PI * 2;
      pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, [radius]);

  useEffect(() => {
    const line = lineObj as THREE.Line;
    return () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [lineObj]);

  useFrame((_, delta) => {
    if (nodeCarrierRef.current) nodeCarrierRef.current.rotation.z += delta * speed;
  });

  return (
    <group rotation={tilt}>
      <primitive object={lineObj} />
      {/* Node carrier rotates in the ring plane so the asteroid travels the orbit */}
      <group ref={nodeCarrierRef}>
        <group position={[Math.cos(nodeAngle) * radius, Math.sin(nodeAngle) * radius, 0]}>
          <mesh>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshBasicMaterial color={nodeColor} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshBasicMaterial
              color={nodeColor}
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Starfield() {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Random points on a large shell behind the scene
      const r = 24 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.004;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          color="#94a3b8"
          size={0.05}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/** Centers the scene on mobile, drops it slightly on desktop so the
 *  headline area stays dark and readable. */
function SceneContent() {
  const groupRef = useRef<THREE.Group>(null);
  const size = useThree(state => state.size);

  useEffect(() => {
    if (!groupRef.current) return;
    if (size.width < 768) {
      groupRef.current.position.set(0, -2.0, 0);
      groupRef.current.scale.setScalar(0.75);
    } else {
      groupRef.current.position.set(0, -1.1, 0);
      groupRef.current.scale.setScalar(0.82);
    }
  }, [size.width]);

  const { camera, pointer } = useThree();
  useFrame(() => {
    // Eased pointer parallax (technique from the ThreeUI orbital examples)
    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <group ref={groupRef}>
        <ParticleGlobe />
        <OrbitRing radius={2.55} tilt={[1.15, 0.25, 0]} speed={0.22} nodeAngle={0.6} nodeColor="#fbbf24" />
        <OrbitRing radius={2.85} tilt={[1.75, -0.4, 0.35]} speed={-0.16} nodeAngle={2.6} nodeColor="#fb923c" />
        <OrbitRing radius={3.15} tilt={[1.35, 0.9, -0.5]} speed={0.12} nodeAngle={4.4} nodeColor="#f59e0b" />
        <OrbitRing radius={3.45} tilt={[0.7, -0.9, 0.9]} speed={-0.09} nodeAngle={5.3} nodeColor="#fcd34d" />
      </group>
      <Starfield />
    </>
  );
}

export default function HeroOrbits() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 6.4], fov: 45 }}
      dpr={[1, 1.75]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
    >
      <SceneContent />
    </Canvas>
  );
}
