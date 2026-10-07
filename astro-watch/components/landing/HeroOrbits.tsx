'use client';

/**
 * Landing hero background — a particle Earth with amber asteroids on
 * hyperbolic flyby trajectories, plus a distant starfield, rendered in R3F.
 *
 * The flyby paths use the same conic-section math as the app's approach
 * analysis (r = p / (1 + e·cos ν) with e > 1), so the hero literally shows
 * the product's subject: asteroids swinging past Earth. The number of
 * tracks follows today's real NEO feed count (capped for legibility).
 * Static single frame when the user prefers reduced motion.
 *
 * Orbit-ring technique adapted from the ThreeUI catalog examples
 * (Orbital Sphere / Orbital Dust), re-implemented on the project's
 * three/R3F stack.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const GLOBE_RADIUS = 2.2;
const GLOBE_PARTICLES = 10000;
const STAR_COUNT = 1600;

/** Seeded PRNG so the flyby layout is identical on every visit. */
function seededRandom(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function ParticleEarth() {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(GLOBE_PARTICLES * 3);
    const colors = new Float32Array(GLOBE_PARTICLES * 3);
    // Ocean blues; landmass greens where the noise mask is high; polar white.
    const oceanDim = new THREE.Color('#1e3a8a');
    const oceanBright = new THREE.Color('#3b82f6');
    const landDim = new THREE.Color('#15803d');
    const landBright = new THREE.Color('#84cc16');
    const polar = new THREE.Color('#dbe4ee');
    let valid = 0;
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

      let c: THREE.Color;
      if (Math.abs(z) / GLOBE_RADIUS > 0.88) {
        c = polar; // ice caps
      } else if (noise > 0.5) {
        c = landDim.clone().lerp(landBright, Math.min(1, (noise - 0.5) * 2.5)); // continents
      } else {
        c = oceanDim.clone().lerp(oceanBright, Math.min(1, 0.25 + Math.max(0, (noise + 0.1) * 3))); // oceans
      }
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
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.02}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/** Soft radial glow sprite texture, shared by the asteroid heads. */
function useGlowTexture(): THREE.Texture {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 200, 120, 1)');
    gradient.addColorStop(0.35, 'rgba(251, 146, 60, 0.5)');
    gradient.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

interface FlybyParams {
  p: number;        // semi-latus rectum (scene units)
  e: number;        // eccentricity > 1 (hyperbolic)
  nuMax: number;    // visible true-anomaly range (rad)
  speed: number;    // rad/s through the sweep
  phase: number;    // initial offset in the sweep
  rotation: [number, number, number];
  color: string;
}

function hyperbolicPoint(p: number, e: number, nu: number): [number, number] {
  const r = p / (1 + e * Math.cos(nu));
  return [r * Math.cos(nu), r * Math.sin(nu)];
}

/**
 * One asteroid on a hyperbolic flyby: faint inbound/outbound arc, a glowing
 * rock sweeping the path, and a short fading tail. Rocks sweep from −νmax
 * to +νmax and loop — reads as successive approaches.
 */
function FlybyAsteroid({ params, glowTexture }: { params: FlybyParams; glowTexture: THREE.Texture }) {
  const rockRef = useRef<THREE.Group>(null);
  const TAIL_POINTS = 16;

  const { pathObj, tailObj, tailGeo } = useMemo(() => {
    const nuMax = params.nuMax; // resolved once in buildFlybyParams
    const pts: number[] = [];
    const SEGMENTS = 128;
    for (let i = 0; i <= SEGMENTS; i++) {
      const nu = -nuMax + (i / SEGMENTS) * 2 * nuMax;
      const [x, y] = hyperbolicPoint(params.p, params.e, nu);
      pts.push(x, y, 0);
    }
    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const pathMat = new THREE.LineBasicMaterial({
      color: params.color,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Fading tail: vertex colors ramp to black (invisible under additive blending)
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TAIL_POINTS * 3), 3));
    const c = new THREE.Color(params.color);
    const tailColors = new Float32Array(TAIL_POINTS * 3);
    for (let i = 0; i < TAIL_POINTS; i++) {
      const fade = 1 - i / (TAIL_POINTS - 1);
      tailColors[i * 3] = c.r * fade;
      tailColors[i * 3 + 1] = c.g * fade;
      tailColors[i * 3 + 2] = c.b * fade;
    }
    tailGeo.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));
    const tailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return {
      pathObj: new THREE.Line(pathGeo, pathMat),
      tailObj: new THREE.Line(tailGeo, tailMat),
      tailGeo,
    };
  }, [params]);

  useEffect(() => () => {
    pathObj.geometry.dispose();
    (pathObj.material as THREE.Material).dispose();
    tailObj.geometry.dispose();
    (tailObj.material as THREE.Material).dispose();
  }, [pathObj, tailObj]);

  useFrame((state) => {
    const nuMax = params.nuMax;
    const sweep = ((state.clock.elapsedTime * params.speed + params.phase) % 2) - 1; // -1..1
    const nu = sweep * nuMax;

    if (rockRef.current) {
      const [x, y] = hyperbolicPoint(params.p, params.e, nu);
      rockRef.current.position.set(x, y, 0);
    }
    const attr = tailGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < TAIL_POINTS; i++) {
      const tailNu = nu - (i + 1) * (nuMax / 26);
      const [tx, ty] = hyperbolicPoint(params.p, params.e, tailNu);
      attr.setXYZ(i, tx, ty, 0);
    }
    attr.needsUpdate = true;
  });

  return (
    <group rotation={params.rotation}>
      <primitive object={pathObj} />
      <primitive object={tailObj} />
      <group ref={rockRef}>
        <mesh>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color={params.color} />
        </mesh>
        <sprite scale={[0.4, 0.4, 1]}>
          <spriteMaterial
            map={glowTexture}
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
            opacity={0.8}
          />
        </sprite>
      </group>
    </group>
  );
}

function Starfield() {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
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

/** Build stable flyby parameters — layout depends only on the track count. */
function buildFlybyParams(trackCount: number): FlybyParams[] {
  const palette = ['#fbbf24', '#fb923c', '#f59e0b', '#fcd34d', '#f97316'];
  const params: FlybyParams[] = [];
  for (let i = 0; i < trackCount; i++) {
    const rand = seededRandom(`flyby-${i}`);
    const e = 2.0 + rand() * 1.2;                       // hyperbolic excess
    const perigee = GLOBE_RADIUS * (1.45 + rand() * 0.5); // miss distance
    const p = perigee * (1 + e);
    // Visible arc where r < 8R — resolves the true-anomaly sweep so the
    // drawn path and the traveling rock share one range.
    const cosNu = (p / (GLOBE_RADIUS * 5.5) - 1) / e;
    const nuMax = Math.abs(cosNu) < 1 ? Math.acos(cosNu) : 1.5;
    params.push({
      p,
      e,
      nuMax,
      speed: 0.10 + rand() * 0.08,
      phase: rand() * 2,
      rotation: [rand() * Math.PI, rand() * Math.PI * 2, (rand() - 0.5) * 0.8],
      color: palette[i % palette.length],
    });
  }
  return params;
}

/** Centers the scene on mobile, drops it slightly on desktop so the
 *  headline area stays dark and readable. */
function SceneContent({ trackCount }: { trackCount: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const size = useThree(state => state.size);
  const glowTexture = useGlowTexture();
  const flybyParams = useMemo(() => buildFlybyParams(trackCount), [trackCount]);

  useEffect(() => {
    if (!groupRef.current) return;
    if (size.width < 768) {
      groupRef.current.position.set(0, -2.0, 0);
      groupRef.current.scale.setScalar(0.75);
    } else {
      groupRef.current.position.set(0, -1.35, 0);
      groupRef.current.scale.setScalar(0.78);
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
        <ParticleEarth />
        {flybyParams.map((params, i) => (
          <FlybyAsteroid key={i} params={params} glowTexture={glowTexture} />
        ))}
      </group>
      <Starfield />
    </>
  );
}

export default function HeroOrbits({ asteroidCount }: { asteroidCount?: number }) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Real objects from today's feed (LandingPage fetch), capped for legibility
  const trackCount = Math.min(Math.max(asteroidCount ?? 7, 3), 8);

  return (
    <Canvas
      camera={{ position: [0, 0, 6.4], fov: 45 }}
      dpr={[1, 1.75]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
    >
      <SceneContent trackCount={trackCount} />
    </Canvas>
  );
}
