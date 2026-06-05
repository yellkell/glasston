/**
 * Shared ping-pong ball spawner. Both the player's blaster and the cat
 * opponent fire through this so behaviour and look stay consistent.
 *
 * The ball is a clean matte-white sphere with a soft owner-coloured tint baked
 * into its emissive (blue = your shots, pink = the cat's) so you can read whose
 * shot is incoming at a glance. No additive glow/trail: those transparent quads
 * composite into dark "halo" artifacts over AR passthrough, and a real ping-pong
 * ball doesn't glow anyway.
 */

import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Entity,
  type World,
} from '@iwsdk/core';
import { Projectile } from '../components/Projectile.js';
import { Damaging } from '../components/Damaging.js';

const BASE_RADIUS = 0.045;
const BALL_GEO = new SphereGeometry(BASE_RADIUS, 18, 14);

export interface SpawnProjectileOptions {
  position: Vector3;
  direction: Vector3; // need not be normalized
  speed: number;
  owner: 0 | 1; // 0 = player, 1 = opponent
  damage: number;
  color: number; // owner-tint colour
  radius?: number;
  lifetime?: number;
}

const _dir = new Vector3();

export function spawnProjectile(world: World, opts: SpawnProjectileOptions): Entity {
  const radius = opts.radius ?? BASE_RADIUS;
  _dir.copy(opts.direction).normalize();

  const group = new Group();

  const ball = new Mesh(
    BALL_GEO,
    new MeshStandardMaterial({
      color: new Color(0xfafdff),
      emissive: new Color(opts.color),
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0,
    }),
  );
  ball.scale.setScalar(radius / BASE_RADIUS);
  group.add(ball);

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
