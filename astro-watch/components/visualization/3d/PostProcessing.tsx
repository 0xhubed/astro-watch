'use client';

import { type JSX } from 'react';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { Vector2 } from 'three';

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
  const effects: JSX.Element[] = [
    <ToneMapping key="tone-mapping" mode={ToneMappingMode.ACES_FILMIC} />,
  ];

  if (enableBloom) {
    effects.unshift(
      <Bloom
        key="bloom"
        intensity={0.8}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
    );
  }

  if (enableVignette) {
    effects.push(
      <Vignette
        key="vignette"
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
    );
  }

  if (enableChromaticAberration && !isMobile) {
    effects.push(
      <ChromaticAberration
        key="chromatic-aberration"
        offset={new Vector2(0.002, 0.002)}
        blendFunction={BlendFunction.NORMAL}
        radialModulation
        modulationOffset={0.5}
      />
    );
  }

  return (
    <EffectComposer multisampling={isMobile ? 0 : 4}>
      {effects}
    </EffectComposer>
  );
}
