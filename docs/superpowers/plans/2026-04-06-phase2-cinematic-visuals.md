# Phase 2: Cinematic Visuals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the 3D scene from solid Three.js into a cinematic portfolio piece with post-processing, procedural asteroid geometry, particle effects, and a cinematic camera system.

**Architecture:** All changes are in the visualization layer. The main file `EnhancedSolarSystem.tsx` (2,302 lines) is already large — we'll extract new systems into separate files to keep things manageable. Post-processing wraps the existing Canvas. New components slot into the existing scene graph.

**Tech Stack:** React Three Fiber, @react-three/postprocessing (already installed), @react-three/drei, Three.js 0.178, custom GLSL shaders.

**Important note:** The comment at line 1867 says "Environment and post-processing disabled — incompatible with three 0.178". This needs testing — R3F postprocessing v3.0.4 may have resolved this. If not, we fall back to manual EffectComposer from Three.js directly.

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/visualization/3d/PostProcessing.tsx` | Bloom, tone mapping, vignette, chromatic aberration, god rays |
| Create | `components/visualization/3d/ProceduralAsteroid.tsx` | Noise-displaced IcosahedronGeometry, PBR material, LOD, glow ring |
| Create | `components/visualization/3d/ParticleEffects.tsx` | Solar wind, asteroid trails, dust/debris |
| Create | `components/visualization/3d/CinematicCamera.tsx` | Close-approach tracking mode, depth-of-field, AI director API |
| Modify | `components/visualization/3d/EnhancedSolarSystem.tsx` | Integrate new components, remove old asteroid rendering |

---

### Task 1: Post-Processing Pipeline

**Files:**
- Create: `astro-watch/components/visualization/3d/PostProcessing.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (wrap scene with EffectComposer)

- [ ] **Step 1: Create PostProcessing.tsx**

Create `astro-watch/components/visualization/3d/PostProcessing.tsx`:

```tsx
'use client';

import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Vector2 } from 'three';
import { useThree } from '@react-three/fiber';

interface PostProcessingProps {
  enableBloom?: boolean;
  enableVignette?: boolean;
  enableChromaticAberration?: boolean;
  isMobile?: boolean;
}

export function PostProcessingEffects({
  enableBloom = true,
  enableVignette = true,
  enableChromaticAberration = true,
  isMobile = false,
}: PostProcessingProps) {
  return (
    <EffectComposer multisampling={isMobile ? 0 : 4}>
      {enableBloom && (
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {enableVignette && (
        <Vignette
          offset={0.3}
          darkness={0.5}
          blendFunction={BlendFunction.NORMAL}
        />
      )}
      {enableChromaticAberration && !isMobile && (
        <ChromaticAberration
          offset={new Vector2(0.002, 0.002)}
          blendFunction={BlendFunction.NORMAL}
          radialModulation
          modulationOffset={0.5}
        />
      )}
    </EffectComposer>
  );
}
```

- [ ] **Step 2: Test postprocessing compatibility with Three.js 0.178**

In `EnhancedSolarSystem.tsx`, add a minimal test by importing and placing `PostProcessingEffects` inside the Canvas, after `SolarSystemScene`:

```tsx
import { PostProcessingEffects } from './PostProcessing';
```

Inside the Canvas (after `</SolarSystemScene>`):
```tsx
<PostProcessingEffects />
```

Run `npm run dev` and check for errors. If `@react-three/postprocessing` throws with Three.js 0.178, we'll need to check version compatibility and potentially adjust.

- [ ] **Step 3: Remove the old incompatibility comment**

In `EnhancedSolarSystem.tsx`, find and remove the comment around line 1867:
```
// Environment and post-processing disabled — incompatible with three 0.178
```

- [ ] **Step 4: Add mobile detection**

In `EnhancedSolarSystem.tsx`, inside the main `EnhancedSolarSystem` component, add:

```tsx
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
```

Pass it to `PostProcessingEffects`:
```tsx
<PostProcessingEffects isMobile={isMobile} />
```

- [ ] **Step 5: Remove the Canvas-level toneMapping**

Since PostProcessing now handles tone mapping, remove from the `gl` prop on Canvas (around line 2072):
```tsx
// Remove these two lines from the gl config:
toneMapping: THREE.ACESFilmicToneMapping,
toneMappingExposure: 1.0,
```

Replace with:
```tsx
toneMapping: THREE.NoToneMapping,
```

This lets the EffectComposer ToneMapping effect handle it instead (avoids double tone mapping).

- [ ] **Step 6: Tune bloom for Sun and high-risk asteroids**

The Sun already has `toneMapped: false` and `emissiveIntensity: 2.0`, so it will naturally bloom. Verify the effect looks good. Adjust `luminanceThreshold` in PostProcessing.tsx if the bloom is too strong or too weak. The goal: Sun corona bleeds light, stars get soft halos, high-rarity asteroids glow.

- [ ] **Step 7: Verify and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck && npm run build
```

```bash
git add components/visualization/3d/PostProcessing.tsx components/visualization/3d/EnhancedSolarSystem.tsx
git commit -m "Add post-processing pipeline: bloom, vignette, chromatic aberration, tone mapping"
```

---

### Task 2: Procedural Asteroid Geometry

**Files:**
- Create: `astro-watch/components/visualization/3d/ProceduralAsteroid.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (replace AsteroidSphere usage)

- [ ] **Step 1: Create ProceduralAsteroid.tsx with noise-displaced geometry**

Create `astro-watch/components/visualization/3d/ProceduralAsteroid.tsx`:

```tsx
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simple 3D noise function for vertex displacement
function noise3D(x: number, y: number, z: number): number {
  const p = x * 12.9898 + y * 78.233 + z * 45.164;
  return (Math.sin(p) * 43758.5453) % 1;
}

function displaceGeometry(geometry: THREE.IcosahedronGeometry, seed: number, intensity: number): THREE.IcosahedronGeometry {
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const n = noise3D(
      vertex.x * 2.0 + seed,
      vertex.y * 2.0 + seed * 0.7,
      vertex.z * 2.0 + seed * 1.3
    );
    const displacement = 1.0 + n * intensity;
    vertex.normalize().multiplyScalar(displacement);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

interface ProceduralAsteroidProps {
  position: [number, number, number];
  scale: number;
  seed: number;            // Deterministic shape from asteroid ID
  riskColor: string;       // Hex color based on rarity
  emissiveIntensity: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export function ProceduralAsteroid({
  position,
  scale,
  seed,
  riskColor,
  emissiveIntensity,
  isSelected,
  isHovered,
  onClick,
  onDoubleClick,
  onPointerOver,
  onPointerOut,
}: ProceduralAsteroidProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Determine LOD detail level based on selection state
  const detail = isSelected ? 2 : isHovered ? 1 : 0;
  
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, detail + 1);
    return displaceGeometry(geo, seed, 0.3);
  }, [seed, detail]);
  
  // Spectral type coloring based on seed
  const baseColor = useMemo(() => {
    const type = seed % 3;
    if (type === 0) return '#8b7355'; // S-type: brownish silicate
    if (type === 1) return '#4a4a4a'; // C-type: dark carbonaceous
    return '#9a9a9a';                  // M-type: metallic gray
  }, [seed]);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });
  
  const finalScale = scale * (isSelected ? 2 : isHovered ? 1.5 : 1);
  
  return (
    <group position={position}>
      {/* Rocky body */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        scale={finalScale}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <meshStandardMaterial
          color={baseColor}
          roughness={0.9}
          metalness={seed % 3 === 2 ? 0.4 : 0.1}
          emissive={riskColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      
      {/* Risk glow ring */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        scale={finalScale * 1.8}
      >
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial
          color={riskColor}
          transparent
          opacity={isSelected ? 0.7 : isHovered ? 0.5 : 0.2 + emissiveIntensity * 0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Replace AsteroidSphere with ProceduralAsteroid in EnhancedSolarSystem.tsx**

In `EnhancedSolarSystem.tsx`, find the `AsteroidField` component (around line 1352). It maps over asteroids and renders `AsteroidSphere` for each. Replace the `AsteroidSphere` component call with `ProceduralAsteroid`, adapting the props:

Import at top of file:
```tsx
import { ProceduralAsteroid } from './ProceduralAsteroid';
```

In the asteroid mapping (inside `AsteroidField`), replace each `<AsteroidSphere ... />` with:
```tsx
<ProceduralAsteroid
  key={asteroid.id}
  position={[x, y, z]}
  scale={calculatedScale}
  seed={parseInt(asteroid.id.replace(/\D/g, '').slice(-6)) || index}
  riskColor={getRarity3DColor(asteroid.rarity)}
  emissiveIntensity={isSelected ? 0.8 : isHovered ? 0.5 : 0.15 + asteroid.rarity * 0.08}
  isSelected={isSelected}
  isHovered={isHovered}
  onClick={() => onAsteroidSelect(asteroid)}
  onDoubleClick={() => { /* existing handler */ }}
  onPointerOver={() => setHoveredAsteroid(index)}
  onPointerOut={() => setHoveredAsteroid(null)}
/>
```

- [ ] **Step 3: Remove the old AsteroidSphere function**

Delete the `AsteroidSphere` function (around lines 1204-1345) from `EnhancedSolarSystem.tsx` since it's replaced by `ProceduralAsteroid`.

- [ ] **Step 4: Verify rendering and commit**

```bash
cd astro-watch/astro-watch && npm run dev
```

Check: asteroids now appear as irregular rocky shapes instead of smooth spheres. Each has a faint ring glow. Selected asteroids glow brighter with a more visible ring.

```bash
npm run typecheck
git add components/visualization/3d/ProceduralAsteroid.tsx components/visualization/3d/EnhancedSolarSystem.tsx
git commit -m "Replace sphere asteroids with procedural noise-displaced geometry and risk rings"
```

---

### Task 3: Particle Effects

**Files:**
- Create: `astro-watch/components/visualization/3d/ParticleEffects.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (add to scene)

- [ ] **Step 1: Create ParticleEffects.tsx**

Create `astro-watch/components/visualization/3d/ParticleEffects.tsx` with three particle systems:

```tsx
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- Solar Wind ---
export function SolarWind({ count = 2000 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Start near the Sun (radius 10-12)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 10 + Math.random() * 2;
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      // Outward velocity with slight randomness
      const speed = 0.3 + Math.random() * 0.5;
      vel[i * 3] = (pos[i * 3] / r) * speed;
      vel[i * 3 + 1] = (pos[i * 3 + 1] / r) * speed;
      vel[i * 3 + 2] = (pos[i * 3 + 2] / r) * speed;
    }
    
    return { positions: pos, velocities: vel };
  }, [count]);
  
  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pos[idx] += velocities[idx] * delta * 20;
      pos[idx + 1] += velocities[idx + 1] * delta * 20;
      pos[idx + 2] += velocities[idx + 2] * delta * 20;
      
      // Reset particle when too far from Sun
      const dist = Math.sqrt(pos[idx] ** 2 + pos[idx + 1] ** 2 + pos[idx + 2] ** 2);
      if (dist > 200) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 10 + Math.random() * 2;
        pos[idx] = r * Math.sin(phi) * Math.cos(theta);
        pos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[idx + 2] = r * Math.cos(phi);
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFD700"
        size={0.3}
        transparent
        opacity={0.15}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// --- Space Dust ---
export function SpaceDust({ count = 500 }: { count?: number }) {
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distributed in the asteroid belt region (30-150 units from center)
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 120;
      const height = (Math.random() - 0.5) * 20;
      
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return pos;
  }, [count]);
  
  const pointsRef = useRef<THREE.Points>(null);
  
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.002;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#aaaacc"
        size={0.4}
        transparent
        opacity={0.08}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
```

- [ ] **Step 2: Add particle effects to the scene**

In `EnhancedSolarSystem.tsx`, import and add inside `SolarSystemScene`, near the Sun and star field:

```tsx
import { SolarWind, SpaceDust } from './ParticleEffects';
```

Inside the scene graph (after `<Sun />` and before asteroids):
```tsx
<SolarWind count={1500} />
<SpaceDust count={400} />
```

- [ ] **Step 3: Verify performance and commit**

```bash
cd astro-watch/astro-watch && npm run dev
```

Check: golden particles stream outward from Sun, faint dust motes visible in asteroid belt region. FPS should stay smooth (particles are lightweight).

```bash
npm run typecheck
git add components/visualization/3d/ParticleEffects.tsx components/visualization/3d/EnhancedSolarSystem.tsx
git commit -m "Add solar wind and space dust particle effects"
```

---

### Task 4: Cinematic Camera System

**Files:**
- Create: `astro-watch/components/visualization/3d/CinematicCamera.tsx`
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (integrate camera modes)

- [ ] **Step 1: Create CinematicCamera.tsx**

Create `astro-watch/components/visualization/3d/CinematicCamera.tsx` with a close-approach tracking mode:

```tsx
'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CinematicCameraProps {
  target: THREE.Vector3 | null;         // World position of selected asteroid
  enabled: boolean;                      // Whether cinematic mode is active
  onComplete?: () => void;              // Called when flyby animation completes
}

export function useCinematicCamera({
  target,
  enabled,
  onComplete,
}: CinematicCameraProps) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const startPosRef = useRef(new THREE.Vector3());
  const isActiveRef = useRef(false);
  
  useEffect(() => {
    if (enabled && target) {
      startPosRef.current.copy(camera.position);
      progressRef.current = 0;
      isActiveRef.current = true;
    } else {
      isActiveRef.current = false;
    }
  }, [enabled, target, camera]);
  
  useFrame((_, delta) => {
    if (!isActiveRef.current || !target) return;
    
    progressRef.current += delta * 0.3; // ~3 second flyby
    const t = Math.min(progressRef.current, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    
    // Camera arcs around the target
    const offset = new THREE.Vector3(
      Math.cos(eased * Math.PI * 0.5) * 15,
      5 + Math.sin(eased * Math.PI) * 8,
      Math.sin(eased * Math.PI * 0.5) * 15
    );
    
    const desiredPos = target.clone().add(offset);
    camera.position.lerp(desiredPos, 0.05);
    camera.lookAt(target);
    
    if (t >= 1) {
      isActiveRef.current = false;
      onComplete?.();
    }
  });
}
```

- [ ] **Step 2: Add cinematic mode trigger to EnhancedSolarSystem**

In `EnhancedSolarSystem.tsx`, import the hook:
```tsx
import { useCinematicCamera } from './CinematicCamera';
```

Inside `SolarSystemScene`, add state for cinematic mode and the hook:
```tsx
const [cinematicMode, setCinematicMode] = useState(false);
const selectedWorldPos = useMemo(() => {
  if (!selectedAsteroid) return null;
  // Calculate world position from asteroid orbit data (reuse existing position calc)
  return new THREE.Vector3(/* asteroid x, y, z from existing calc */);
}, [selectedAsteroid]);

useCinematicCamera({
  target: selectedWorldPos,
  enabled: cinematicMode,
  onComplete: () => setCinematicMode(false),
});
```

Add a "Cinematic View" button to the existing `CameraControls` panel (around line 1567):
```tsx
<button
  onClick={() => setCinematicMode(true)}
  disabled={!selectedAsteroid}
  className="px-3 py-1.5 bg-purple-600/30 border border-purple-500/30 rounded text-sm text-purple-300 hover:bg-purple-600/50 disabled:opacity-30"
>
  Cinematic View
</button>
```

- [ ] **Step 3: Expose cinematic camera for future AI control**

Export a function from the module that the chat assistant can call later (Phase 3). Add to the Zustand store in `lib/store.ts`:

```tsx
// Add to store state:
cinematicTarget: null as string | null,
setCinematicTarget: (id: string | null) => set({ cinematicTarget: id }),
```

This doesn't need to work yet — just the store slot. The chat assistant will call `setCinematicTarget` in Phase 3.

- [ ] **Step 4: Verify and commit**

```bash
cd astro-watch/astro-watch && npm run typecheck && npm run dev
```

Select an asteroid, click "Cinematic View" — camera should arc around the asteroid in a ~3 second flyby.

```bash
git add components/visualization/3d/CinematicCamera.tsx components/visualization/3d/EnhancedSolarSystem.tsx lib/store.ts
git commit -m "Add cinematic camera system with close-approach tracking mode"
```

---

### Task 5: Integration and Polish

**Files:**
- Modify: `astro-watch/components/visualization/3d/EnhancedSolarSystem.tsx` (cleanup)

- [ ] **Step 1: Remove the old AsteroidTrails component if it conflicts with new particle trails**

Check if the existing `AsteroidTrails` component (around line 1432) is still rendering correctly alongside the new particle effects. If it looks good, keep it. If there's visual clutter or performance issues, simplify it.

- [ ] **Step 2: Verify mobile performance**

Test on a mobile viewport (Chrome DevTools device toolbar, 375px width):
- Post-processing should disable chromatic aberration (already handled by `isMobile` prop)
- Particle counts should be manageable
- FPS should stay above 30

If mobile FPS drops below 30, reduce particle counts:
```tsx
<SolarWind count={isMobile ? 500 : 1500} />
<SpaceDust count={isMobile ? 150 : 400} />
```

- [ ] **Step 3: Run full build verification**

```bash
cd astro-watch/astro-watch
npm run typecheck
npm run build
```

Both should pass.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Polish cinematic visuals: mobile performance, cleanup"
```
