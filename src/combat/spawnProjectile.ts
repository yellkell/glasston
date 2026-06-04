/**
 * Shared ping-pong ball spawner. Both the player's blaster and the cat
 * opponent fire through this so behaviour and look stay consistent.
 *
 * Each shot is a light matte-white ball with a soft owner-tinted glow halo and
 * a short, gentle trail — playful and, above all, easy to read so you can dodge
 * it with your body. Owner tint: blue = your shots, pink = the cat's.
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
import { glowSprite, makeTrail } from '../materials/glow.js';

const BASE_RADIUS = 0.045;
const BALL_GEO = new SphereGeometry(BASE_RADIUS, 18, 14);

export interface SpawnProjectileOptions {
  position: Vector3;
  direction: Vector3; // need not be normalized
  speed: number;
  owner: 0 | 1; // 0 = player, 1 = opponent
  damage: number;
  color: number; // owner-tint glow colour
  radius?: number;
  lifetime?: number;
}

const _dir = new Vector3();

export function spawnProjectile(world: World, opts: SpawnProjectileOptions): Entity {
  const radius = opts.radius ?? BASE_RADIUS;
  _dir.copy(opts.direction).normalize();

  const group = new Group();

  // The ball itself: bright matte white, like a real ping-pong ball, with the
  // owner colour faintly warming it so you can tell the shots apart in flight.
  const ball = new Mesh(
    BALL_GEO,
    new MeshStandardMaterial({
      color: new Color(0xfafdff),
      emissive: new Color(opts.color),
      emissiveIntensity: 0.35,
      roughness: 0.55,
      metalness: 0,
    }),
  );
  ball.scale.setScalar(radius / BASE_RADIUS);
  group.add(ball);

  // Soft halo + a gentle trail in the owner's colour.
  group.add(glowSprite(opts.color, radius * 4.5, 0.55));
  group.add(makeTrail(opts.color, radius * 7, radius * 2));

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
