/**
 * Builds the static arena for passthrough Blasto. Because the player's real
 * room is the backdrop, we keep set-dressing minimal and floor-level:
 *  - a soft glowing octagon ring marking YOUR dodge zone on the real floor,
 *  - a low pastel rail across the front to lean over,
 *  - a small landing pad under the cat opponent across the room,
 *  - gentle, friendly fill light (no dark-room spotlights).
 *
 * Weapon pedestals are spawned separately as entities (see weapons/setup).
 *
 * These are plain Three.js objects parented under `world.scene` — static
 * set-dressing. Dynamic, interactive objects become ECS entities.
 */

import {
  Color,
  Group,
  HemisphereLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  TorusGeometry,
  Vector3,
  BufferGeometry,
  type Object3D,
} from 'three';
import type { World } from '@iwsdk/core';
import { ARENA_GAP, OCTAGON_HALF_WIDTH, OCTAGON_VERTICES, PALETTE } from '../config.js';
import { registerPulse } from '../materials/pulse.js';

/** A soft glowing outline of the octagon play space, laid flat on the floor. */
function makeBoundaryRing(color: number): Line {
  const pts = OCTAGON_VERTICES.map(([x, z]) => new Vector3(x, 0.01, z));
  pts.push(pts[0].clone()); // close the loop
  const geo = new BufferGeometry().setFromPoints(pts);
  const ring = new Line(geo, new LineBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.85 }));
  ring.name = 'boundary-ring';
  return ring;
}

/** A small pad under a duelist: a flat translucent ring marking their spot. */
function makePad(color: number): Mesh {
  const geo = new TorusGeometry(0.55, 0.03, 12, 40);
  const mat = new MeshStandardMaterial({
    color: new Color(color),
    emissive: new Color(color),
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.85,
  });
  registerPulse(mat, { amp: 0.3, speed: 1.4 });
  const pad = new Mesh(geo, mat);
  pad.rotation.x = Math.PI / 2;
  pad.position.y = 0.02;
  pad.name = 'pad';
  return pad;
}

export function buildArena(world: World): Object3D {
  const scene = world.scene;

  const arena = new Group();
  arena.name = 'arena';

  // Your dodge zone marked on the real floor, plus a low rail to lean over.
  arena.add(makeBoundaryRing(PALETTE.blue));

  const railGeo = new TorusGeometry(OCTAGON_HALF_WIDTH * 0.95, 0.03, 16, 48, Math.PI);
  const railMat = new MeshStandardMaterial({
    color: new Color(PALETTE.blue),
    emissive: new Color(PALETTE.blue),
    emissiveIntensity: 1.2,
  });
  registerPulse(railMat, { amp: 0.4, speed: 1.3 });
  const rail = new Mesh(railGeo, railMat);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0, 0.95, -0.45);
  arena.add(rail);

  // The cat opponent's landing pad across the room.
  const oppPad = makePad(PALETTE.pink);
  oppPad.position.set(0, 0, -ARENA_GAP);
  arena.add(oppPad);

  // --- Friendly, even lighting (passthrough rooms are usually well lit) ---
  // Cool sky / warm pink bounce keeps the toy surfaces reading nicely.
  arena.add(new HemisphereLight(0xdfefff, 0xffd9ec, 1.4));
  // A soft purple key so the cat and blasters have a little form to them.
  const key = new PointLight(PALETTE.purple, 8, 16);
  key.position.set(0, 3, -ARENA_GAP / 2);
  arena.add(key);

  scene.add(arena);
  return arena;
}
