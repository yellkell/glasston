/**
 * Shared glass-orb projectile spawner. Both the player's weapon and the
 * opponent fire through this so behaviour and look stay consistent.
 *
 * Each orb is a small emissive core + an additive glow halo + a crossed-quad
 * motion trail (oriented to velocity by ProjectileSystem) — reads as a glowing
 * blown-glass bullet.
 */

import {
  Group,
  Mesh,
  SphereGeometry,
  Vector3,
  type Entity,
  type World,
} from '@iwsdk/core';
import { Projectile } from '../components/Projectile.js';
import { Damaging } from '../components/Damaging.js';
import { fakeGlass } from '../materials/glass.js';
import { glowSprite, makeTrail } from '../materials/glow.js';

const BASE_RADIUS = 0.045;
const ORB_GEO = new SphereGeometry(BASE_RADIUS, 16, 16);

export interface SpawnProjectileOptions {
  position: Vector3;
  direction: Vector3; // need not be normalized
  speed: number;
  owner: 0 | 1; // 0 = player, 1 = opponent
  damage: number;
  color: number;
  radius?: number;
  lifetime?: number;
}

const _dir = new Vector3();

export function spawnProjectile(world: World, opts: SpawnProjectileOptions): Entity {
  const radius = opts.radius ?? BASE_RADIUS;
  _dir.copy(opts.direction).normalize();

  const group = new Group();

  const orb = new Mesh(ORB_GEO, fakeGlass({ color: opts.color, emissive: opts.color, emissiveIntensity: 3 }));
  orb.scale.setScalar(radius / BASE_RADIUS);
  group.add(orb);

  group.add(glowSprite(opts.color, radius * 6, 0.9));
  group.add(makeTrail(opts.color, radius * 9, radius * 2.2));

  const entity = world.createTransformEntity(group);
  entity.object3D!.position.copy(opts.position);
  entity.addComponent(Projectile, {
    velocity: [_dir.x * opts.speed, _dir.y * opts.speed, _dir.z * opts.speed],
    lifetime: opts.lifetime ?? 4,
    radius,
    owner: opts.owner,
  });
  entity.addComponent(Damaging, { damage: opts.damage });
  return entity;
}
