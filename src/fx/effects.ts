/**
 * Spawners for transient visual effects. Cheap, self-destructing entities the
 * FXSystem animates: muzzle flashes and impact bursts (shockwave + glass shards).
 */

import {
  Color,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type ColorRepresentation,
  type World,
} from '@iwsdk/core';
import { Effect, EffectKind } from '../components/Effect.js';
import { glowSprite } from '../materials/glow.js';

const SHARD_GEO = new IcosahedronGeometry(0.03, 0);

export function spawnMuzzleFlash(world: World, pos: Vector3, color: ColorRepresentation): void {
  const sprite = glowSprite(color, 0.22);
  const e = world.createTransformEntity(sprite);
  e.object3D!.position.copy(pos);
  e.addComponent(Effect, { kind: EffectKind.Flash, life: 0.09, baseScale: 0.22 });
}

export function spawnImpact(world: World, pos: Vector3, color: ColorRepresentation): void {
  // Bright central pop.
  const flash = glowSprite(color, 0.4);
  const fe = world.createTransformEntity(flash);
  fe.object3D!.position.copy(pos);
  fe.addComponent(Effect, { kind: EffectKind.Flash, life: 0.16, baseScale: 0.4 });

  // Expanding shockwave.
  const ring = glowSprite(0xffffff, 0.3, 0.8);
  const re = world.createTransformEntity(ring);
  re.object3D!.position.copy(pos);
  re.addComponent(Effect, { kind: EffectKind.Ring, life: 0.35, baseScale: 0.3 });

  // Glass shards.
  const tint = new Color(color);
  for (let i = 0; i < 8; i++) {
    const mat = new MeshStandardMaterial({
      color: tint,
      emissive: tint,
      emissiveIntensity: 2.2,
      transparent: true,
      roughness: 0.25,
    });
    const shard = new Mesh(SHARD_GEO, mat);
    const e = world.createTransformEntity(shard);
    e.object3D!.position.copy(pos);
    const dir = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const speed = 1.4 + Math.random() * 1.8;
    e.addComponent(Effect, {
      kind: EffectKind.Shard,
      life: 0.5 + Math.random() * 0.35,
      baseScale: 0.7 + Math.random() * 0.8,
      velocity: [dir.x * speed, dir.y * speed + 0.6, dir.z * speed],
      spin: (Math.random() - 0.5) * 12,
    });
  }
}
