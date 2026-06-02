/**
 * Additive "glow" toolkit — how we get a bloom-like neon look without
 * full-screen post-processing (which is fragile/expensive in stereo WebXR).
 *
 * Everything here renders additively with depthWrite off, so emissive cores
 * bleed soft halos and streaks the way real bloom would.
 */

import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  type ColorRepresentation,
  type Texture,
} from 'three';

let _glowTex: Texture | undefined;

/** A soft radial falloff texture (white core → transparent edge), cached. */
export function glowTexture(): Texture {
  if (_glowTex) return _glowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glowTex = new CanvasTexture(canvas);
  return _glowTex;
}

/** A camera-facing additive glow halo. */
export function glowSprite(color: ColorRepresentation, size: number, opacity = 1): Sprite {
  const sprite = new Sprite(
    new SpriteMaterial({
      map: glowTexture(),
      color: new Color(color),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      opacity,
    }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}

/**
 * A crossed-quad motion streak extending backward along local -Z. Two
 * perpendicular planes mean it never fully disappears edge-on. Parent it to a
 * projectile whose object3D is oriented along its velocity.
 */
export function makeTrail(color: ColorRepresentation, length: number, width: number): Group {
  const group = new Group();
  const tex = glowTexture();
  const geo = new PlaneGeometry(width, length);
  // Plane spans local Y; shift so it trails behind (-Z) once rotated to lie along Z.
  for (const roll of [0, Math.PI / 2]) {
    const mat = new MeshBasicMaterial({
      map: tex,
      color: new Color(color),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      opacity: 0.85,
    });
    const quad = new Mesh(geo, mat);
    quad.rotation.x = Math.PI / 2; // lie the plane along the Z axis
    quad.rotation.z = roll;
    quad.position.z = length / 2; // trail sits behind the head (+local Z = backward)
    group.add(quad);
  }
  return group;
}
