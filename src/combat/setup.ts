/**
 * Spawns the Phase-3 combatants:
 *  - a player "combatant" entity that holds the shared Health pool, plus three
 *    body-part hitbox entities (head/chest/pelvis) positioned each frame by the
 *    head-driven IK in `PlayerBodySystem`;
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
import { BodyPart, PlayerBodyPart } from '../components/PlayerBodyPart.js';
import { ARENA_GAP, BODY_IK, COMBAT, PALETTE } from '../config.js';
import { makeGlass, neonEdges } from '../materials/glass.js';

export function setupCombatants(world: World): void {
  // --- Player combatant: holds the shared Health pool (no geometry) ---
  const player = world.createTransformEntity(new Object3D(), { persistent: true });
  player.addComponent(Health, { current: COMBAT.playerHealth, max: COMBAT.playerHealth });

  // Three IK body-part hitboxes (invisible), all draining the player's Health.
  const parts: Array<[number, number]> = [
    [BodyPart.Head, BODY_IK.headRadius],
    [BodyPart.Chest, BODY_IK.chestRadius],
    [BodyPart.Pelvis, BODY_IK.pelvisRadius],
  ];
  for (const [part, radius] of parts) {
    const seg = world.createTransformEntity(new Object3D(), { persistent: true });
    seg.addComponent(Hitbox, { radius, team: 0, owner: player });
    seg.addComponent(PlayerBodyPart, { part });
  }

  // --- Destructible glass dummy (team 1), owns its own Health ---
  const gemGeo = new IcosahedronGeometry(COMBAT.dummyHitboxRadius, 0);
  const gem = new Mesh(
    gemGeo,
    makeGlass({ color: PALETTE.magenta, emissive: PALETTE.magenta, emissiveIntensity: 0.6, thickness: 0.6 }),
  );
  gem.add(neonEdges(gemGeo, PALETTE.magenta));

  const dummy = world.createTransformEntity(gem);
  dummy.object3D!.position.set(0, 1.4, -ARENA_GAP);
  dummy.addComponent(Health, { current: COMBAT.dummyHealth, max: COMBAT.dummyHealth });
  dummy.addComponent(Hitbox, { radius: COMBAT.dummyHitboxRadius, team: 1, owner: dummy });
}
