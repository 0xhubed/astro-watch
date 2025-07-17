'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { EnhancedAsteroid } from '@/lib/nasa-api';

interface Props {
  asteroids: EnhancedAsteroid[];
}

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[3.0, 64, 64]} />
        <meshPhongMaterial
          color="#4a90e2"
          shininess={100}
          specular={new THREE.Color('white')}
        />
      </mesh>
      {/* Atmosphere */}
      <mesh ref={atmosphereRef} scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[3.0, 64, 64]} />
        <meshBasicMaterial
          color="#87ceeb"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function AsteroidField({ asteroids }: { asteroids: EnhancedAsteroid[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = new THREE.Object3D();
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    asteroids.forEach((asteroid, i) => {
      const time = state.clock.elapsedTime;
      const orbit = asteroid.orbit;
      
      // Calculate orbital position
      const angle = (time * orbit.speed) + orbit.phase;
      tempObject.position.x = Math.cos(angle) * orbit.radius;
      tempObject.position.z = Math.sin(angle) * orbit.radius;
      tempObject.position.y = Math.sin(angle * 2) * orbit.inclination;
      
      // Set scale based on size
      const scale = Math.log10(asteroid.size) * 0.5;
      tempObject.scale.setScalar(scale);
      
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      
      // Color based on risk
      const color = new THREE.Color(
        asteroid.risk > 0.7 ? '#ff3b30' : 
        asteroid.risk > 0.4 ? '#ff9500' : 
        '#34c759'
      );
      meshRef.current.setColorAt(i, color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, asteroids.length]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial 
        roughness={0.7}
        metalness={0.3}
      />
    </instancedMesh>
  );
}

export function EnhancedSolarSystem({ asteroids }: Props) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-space-dark via-blue-900/20 to-space-dark">
      <Canvas camera={{ position: [0, 20, 50], fov: 60 }}>
        <Suspense fallback={null}>
          <Stars radius={300} depth={60} count={20000} factor={7} />
          <ambientLight intensity={0.3} />
          <pointLight position={[0, 0, 0]} intensity={2} color="#FDB813" />
          <OrbitControls enablePan={true} enableZoom={true} />
          
          <Earth />
          <AsteroidField asteroids={asteroids} />
        </Suspense>
      </Canvas>
    </div>
  );
}