/**
 * Glassmorphic material factory.
 *
 * The glassmorphism "feel" in 3D comes from physically-based transmission glass
 * (frosted, refractive, light edges) lit by an environment map, with saturated
 * neon colour blooming through. Transmission is expensive, so we expose a cheaper
 * fake-glass variant for high-count objects (e.g. projectiles) — see `fakeGlass`.
 */

import {
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  MeshPhysicalMaterial,
  type BufferGeometry,
  type ColorRepresentation,
  type Object3D,
} from 'three';

export interface GlassOptions {
  /** Surface / attenuation tint. */
  color?: ColorRepresentation;
  /** Emissive core colour (the glow that reads through the glass). */
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  /** 0 = mirror-clear, ~0.2 = lightly frosted. */
  roughness?: number;
  /** 0..1 — how much light passes through (true glass = 1). */
  transmission?: number;
  /** Refraction thickness in metres. */
  thickness?: number;
  ior?: number;
  /** Thin-film iridescent shimmer (0..1) — the premium glassmorphic sheen. */
  iridescence?: number;
  /** How strongly the IBL environment shows in reflections. */
  envMapIntensity?: number;
  /** Render both faces (needed for thin/hollow glass shells). */
  doubleSide?: boolean;
}

/** Full-quality frosted transmission glass for hero surfaces (pads, rail, weapons). */
export function makeGlass(opts: GlassOptions = {}): MeshPhysicalMaterial {
  const {
    color = 0x9ad8ff,
    emissive = 0x000000,
    emissiveIntensity = 1,
    roughness = 0.12,
    transmission = 0.95,
    thickness = 0.5,
    ior = 1.4,
    iridescence = 0.6,
    envMapIntensity = 1.4,
    doubleSide = false,
  } = opts;

  const mat = new MeshPhysicalMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    emissiveIntensity,
    metalness: 0,
    roughness,
    transmission,
    thickness,
    ior,
    iridescence,
    iridescenceIOR: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    specularIntensity: 1,
    envMapIntensity,
    attenuationColor: new Color(color),
    attenuationDistance: 1.5,
    transparent: true,
  });
  if (doubleSide) mat.side = 2; // THREE.DoubleSide
  return mat;
}

/**
 * Cheap glass-like material (opacity + fresnel-ish sheen, no transmission). Use
 * for many simultaneous objects where true transmission would tank the frame rate.
 */
export function fakeGlass(opts: GlassOptions = {}): MeshPhysicalMaterial {
  const { color = 0x9ad8ff, emissive = color, emissiveIntensity = 1.5, roughness = 0.2 } = opts;
  return new MeshPhysicalMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    emissiveIntensity,
    metalness: 0,
    roughness,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
  });
}

/**
 * Add a glowing neon outline to a mesh's geometry — the "light border" that is the
 * signature of glassmorphism. Returns the LineSegments so callers can parent it.
 */
export function neonEdges(geometry: BufferGeometry, color: ColorRepresentation): LineSegments {
  const edges = new EdgesGeometry(geometry, 25);
  const line = new LineSegments(edges, new LineBasicMaterial({ color: new Color(color) }));
  line.name = 'neon-edges';
  return line;
}

/** Convenience: attach neon edges as a child of `target` using `target`'s geometry. */
export function withNeonEdges(target: Object3D & { geometry: BufferGeometry }, color: ColorRepresentation): void {
  target.add(neonEdges(target.geometry, color));
}
