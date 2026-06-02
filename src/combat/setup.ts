/**
 * Spawns the Phase-3 combatants:
 *  - a player body hitbox parented to the headset, so ducking/leaning your real
 *    body physically moves the hitbox out of the way of incoming shots;
 *  - a destructible glass "dummy" target on the opponent platform to shoot.
 */

import {
  IcosahedronGeometry,
  Mesh,
  Object3D,
  type World,
} from '@iwsdk/core';
import { Health } from '../components/Health.js';
import { Hitbox } from '../components/Hitbox.js';
import { ARENA_GAP, COMBAT, PALETTE } from '../config.js';
import { makeGlass, neonEdges } from '../materials/glass.js';

export function setupCombatants(world: World): void {
  // --- Player body hitbox (team 0), following the head pose ---
  const playerHit = world.createTransformEntity(new Object3D(), {
    parent: world.playerHeadEntity,
    persistent: true,
  });
  playerHit.addComponent(Health, { current: COMBAT.playerHealth, max: COMBAT.playerHealth });
  playerHit.addComponent(Hitbox, { radius: COMBAT.playerHitboxRadius, team: 0 });

  // --- Destructible glass dummy (team 1) on the opponent platform ---
  const gemGeo = new IcosahedronGeometry(COMBAT.dummyHitboxRadius, 0);
  const gem = new Mesh(gemGeo, makeGlass({ color: PALETTE.magenta, emissive: PALETTE.magenta, emissiveIntensity: 0.6, thickness: 0.6 }));
  gem.add(neonEdges(gemGeo, PALETTE.magenta));

  const dummy = world.createTransformEntity(gem);
  dummy.object3D!.position.set(0, 1.4, -ARENA_GAP);
  dummy.addComponent(Health, { current: COMBAT.dummyHealth, max: COMBAT.dummyHealth });
  dummy.addComponent(Hitbox, { radius: COMBAT.dummyHitboxRadius, team: 1 });
}
