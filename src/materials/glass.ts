/**
 * Playful "toy plastic" material factory.
 *
 * Blasto's surfaces — the cat duelist, the blasters, the pedestals — read like
 * smooth, glossy, brightly-coloured toys. That look comes from a physically
 * based material with a strong clearcoat (the shiny lacquer of a vinyl toy),
 * low-but-not-mirror roughness, and a touch of soft emissive so colours stay
 * cheerful even in dim rooms. Opaque by default so they sit crisply over the
 * AR passthrough feed.
 *
 * The exported names are kept (`makeGlass` / `fakeGlass` / edge helpers) so the
 * rest of the codebase keeps working after the pivot from the old glass look.
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
  /** Base surface colour. */
  color?: ColorRepresentation;
  /** Optional soft self-lit glow colour. */
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  /** 0 = mirror-gloss, ~0.4 = soft matte plastic. */
  roughness?: number;
  /** 0..1 — how see-through the toy is (0 = solid). */
  transmission?: number;
  /** Refraction thickness in metres (only matters when transmission > 0). */
  thickness?: number;
  ior?: number;
  /** Thin-film iridescent shimmer (0..1) — a subtle pearly sheen. */
  iridescence?: number;
  /** How strongly the IBL environment shows in reflections. */
  envMapIntensity?: number;
  /** Render both faces (needed for thin/hollow shells). */
  doubleSide?: boolean;
}

/** Glossy pastel toy plastic for hero surfaces (cat, blasters, pedestals). */
export function makeGlass(opts: GlassOptions = {}): MeshPhysicalMaterial {
  const {
    color = 0xfafdff,
    emissive = color,
    emissiveIntensity = 0.12,
    roughness = 0.35,
    transmission = 0,
    thickness = 0.3,
    ior = 1.45,
    iridescence = 0.15,
    envMapIntensity = 1.0,
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
    iridescenceIOR: 1.25,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    specularIntensity: 1,
    envMapIntensity,
    transparent: transmission > 0,
  });
  if (doubleSide) mat.side = 2; // THREE.DoubleSide
  return mat;
}

/**
 * Cheap, lightly-translucent plastic (opacity + clearcoat, no transmission).
 * Use for many simultaneous objects where physical transmission would tank the
 * frame rate (e.g. effect shards / soft accents).
 */
export function fakeGlass(opts: GlassOptions = {}): MeshPhysicalMaterial {
  const { color = 0xfafdff, emissive = color, emissiveIntensity = 0.5, roughness = 0.4 } = opts;
  return new MeshPhysicalMaterial({
    color: new Color(color),
    emissive: new Color(emissive),
    emissiveIntensity,
    metalness: 0,
    roughness,
    transparent: true,
    opacity: 0.8,
    clearcoat: 1,
  });
}

/**
 * Add a soft, light outline to a mesh's geometry — a gentle toon-ish edge that
 * helps shapes pop against a busy passthrough background. Returns the
 * LineSegments so callers can parent it.
 */
export function neonEdges(geometry: BufferGeometry, color: ColorRepresentation): LineSegments {
  const edges = new EdgesGeometry(geometry, 25);
  const line = new LineSegments(
    edges,
    new LineBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.6 }),
  );
  line.name = 'soft-edges';
  return line;
}

/** Convenience: attach a soft outline as a child of `target` using its geometry. */
export function withNeonEdges(target: Object3D & { geometry: BufferGeometry }, color: ColorRepresentation): void {
  target.add(neonEdges(target.geometry, color));
}
