/**
 * The look foundation: filmic tone mapping, a custom dark-neon image-based
 * lighting environment (so transmission glass has rich colour to refract and
 * reflect), a gradient sky dome, a glowing floor grid, and faux-volumetric
 * spotlight cones — the cyberpunk-glass mood from the references.
 */

import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  CanvasTexture,
  Color,
  ConeGeometry,
  DomeGradient,
  IBLGradient,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  type World,
} from '@iwsdk/core';
import { ARENA_GAP, PALETTE } from '../config.js';

/** hex → [r,g,b,a] in 0..1 for Types.Color component fields. */
function rgba(hex: number, a = 1): [number, number, number, number] {
  const c = new Color(hex);
  return [c.r, c.g, c.b, a];
}

export function setupEnvironment(world: World): void {
  // Filmic tone mapping gives neon a soft, cinematic rolloff instead of clipping.
  world.renderer.toneMapping = ACESFilmicToneMapping;
  world.renderer.toneMappingExposure = 1.15;

  // Background dome + IBL via the EnvironmentSystem components.
  const env = world.createTransformEntity(undefined, { persistent: true });
  env.addComponent(DomeGradient, {
    sky: rgba(0x05060f),
    equator: rgba(0x0a0820),
    ground: rgba(0x02030a),
    intensity: 1,
  });
  env.addComponent(IBLGradient, {
    // Coloured IBL so glass picks up cyan-above / magenta-below tints.
    sky: rgba(0x123a55),
    equator: rgba(0x3a1240),
    ground: rgba(0x081427),
    intensity: 1.25,
  });

  world.scene.add(makeFloorGrid());
  world.scene.add(makeLightCone(PALETTE.cyan, 0));
  world.scene.add(makeLightCone(PALETTE.magenta, -ARENA_GAP));
}

/** A large dark floor with a glowing neon grid receding into the black. */
function makeFloorGrid(): Mesh {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  const cells = 8;
  const step = size / cells;
  for (let i = 0; i <= cells; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(24, 24);

  const floor = new Mesh(
    new PlaneGeometry(60, 60),
    new MeshBasicMaterial({
      map: tex,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      color: new Color(PALETTE.cyan),
      opacity: 0.32,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.05, -ARENA_GAP / 2);
  floor.name = 'floor-grid';
  return floor;
}

/** A soft additive cone standing in for a volumetric spotlight shaft. */
function makeLightCone(color: number, z: number): Mesh {
  const cone = new Mesh(
    new ConeGeometry(1.5, 4, 24, 1, true),
    new MeshBasicMaterial({
      color: new Color(color),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: 2, // DoubleSide
      opacity: 0.05,
    }),
  );
  cone.position.set(0, 2.6, z);
  cone.name = 'light-cone';
  return cone;
}
