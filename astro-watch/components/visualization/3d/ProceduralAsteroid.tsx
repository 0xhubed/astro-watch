'use client';

import { useRef, useMemo, memo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function noise3D(x: number, y: number, z: number): number {
  const p = x * 12.9898 + y * 78.233 + z * 45.164;
  return (Math.sin(p) * 43758.5453) % 1;
}

function displaceGeometry(baseGeo: THREE.BufferGeometry, seed: number, intensity: number): THREE.BufferGeometry {
  const geometry = baseGeo.clone();
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
  seed: number;
  riskColor: string;
  emissiveIntensity: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

export const ProceduralAsteroid = memo(function ProceduralAsteroid({
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

  const detail = isSelected ? 2 : isHovered ? 1 : 0;

  // Precompute every LOD level once per seed and swap by reference — hover
  // and selection must not rebuild geometry (#41).
  const geometries = useMemo(() => {
    return [0, 1, 2, 3].map(level =>
      displaceGeometry(new THREE.IcosahedronGeometry(1, level + 1), seed, 0.3)
    );
  }, [seed]);

  useEffect(() => {
    return () => geometries.forEach(g => g.dispose());
  }, [geometries]);

  const geometry = geometries[Math.min(detail, geometries.length - 1)];

  const baseColor = useMemo(() => {
    const type = seed % 3;
    if (type === 0) return '#8b7355';  // S-type: brownish silicate
    if (type === 1) return '#4a4a4a';  // C-type: dark carbonaceous
    return '#9a9a9a';                   // M-type: metallic gray
  }, [seed]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  // Size stays truthful to the data (review #62) — selection is conveyed by
  // the rarity ring and emissive boost, never by inflating the mesh.
  const finalScale = scale;
  const ringScale = finalScale * (isSelected ? 2.4 : isHovered ? 2.0 : 1.8);

  return (
    <group position={position}>
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

      <mesh rotation={[Math.PI / 2, 0, 0]} scale={ringScale}>
        <ringGeometry args={[0.9, 1.0, 32]} />
        <meshBasicMaterial
          color={riskColor}
          transparent
          opacity={isSelected ? 0.95 : isHovered ? 0.7 : 0.2 + emissiveIntensity * 0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});
