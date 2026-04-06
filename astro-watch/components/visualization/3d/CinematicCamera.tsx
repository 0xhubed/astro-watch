'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CinematicCameraProps {
  target: THREE.Vector3 | null;
  enabled: boolean;
  onComplete?: () => void;
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

    progressRef.current += delta * 0.3;
    const t = Math.min(progressRef.current, 1);
    const eased = 1 - Math.pow(1 - t, 3);

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
