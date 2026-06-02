/**
 * A tiny registry of emissive materials that should gently "breathe" — driven
 * each frame by `pulseAll(time)` from the FX system. Subtle motion on neon
 * accents is a big chunk of the production-value feel.
 */

import type { MeshStandardMaterial } from 'three';

interface PulseEntry {
  material: MeshStandardMaterial;
  base: number;
  amp: number;
  speed: number;
  phase: number;
}

const entries: PulseEntry[] = [];

export function registerPulse(
  material: MeshStandardMaterial,
  opts: { amp?: number; speed?: number } = {},
): void {
  entries.push({
    material,
    base: material.emissiveIntensity ?? 1,
    amp: opts.amp ?? 0.35,
    speed: opts.speed ?? 1.6,
    phase: Math.random() * Math.PI * 2,
  });
}

export function pulseAll(time: number): void {
  for (const e of entries) {
    e.material.emissiveIntensity = e.base + Math.sin(time * e.speed + e.phase) * e.amp;
  }
}

/** Clear the registry (e.g. on a full scene rebuild). */
export function clearPulses(): void {
  entries.length = 0;
}
