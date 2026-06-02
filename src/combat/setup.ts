/**
 * Spawns the combatants:
 *  - the player "combatant" entity (shared Health) plus three head-driven IK
 *    body-part hitboxes (see PlayerBodySystem);
 *  - the AI opponent: a glass avatar on the far platform with Health, a Hitbox,
 *    and an AIController that aims, fires and dodges (see AISystem).
 */

import {
  Group,
  IcosahedronGeometry,
  Mesh,
  Object3D,
  SphereGeometry,
  type World,
} from '@iwsdk/core';
import { Health } from '../components/Health.js';
import { Hitbox } from '../components/Hitbox.js';
import { Combatant } from '../components/Combatant.js';
import { AIController } from '../components/AIController.js';
import { BodyPart, PlayerBodyPart } from '../components/PlayerBodyPart.js';
import { AI, ARENA_GAP, BODY_IK, COMBAT, PALETTE } from '../config.js';
import { makeGlass, neonEdges } from '../materials/glass.js';

export function setupCombatants(world: World): void {
  // --- Player combatant: shared Health pool (no geometry) ---
  const player = world.createTransformEntity(new Object3D(), { persistent: true });
  player.addComponent(Health, { current: COMBAT.playerHealth, max: COMBAT.playerHealth });
  player.addComponent(Combatant, { team: 0 });

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

  // --- AI opponent: a glass avatar that moves, dodges and shoots ---
  const opponent = world.createTransformEntity(buildOpponentBody(), { persistent: true });
  opponent.object3D!.position.set(0, AI.bodyY, -ARENA_GAP);
  opponent.addComponent(Health, { current: COMBAT.dummyHealth, max: COMBAT.dummyHealth });
  opponent.addComponent(Combatant, { team: 1 });
  opponent.addComponent(Hitbox, { radius: COMBAT.dummyHitboxRadius, team: 1, owner: opponent });
  opponent.addComponent(AIController, {
    fireTimer: AI.fireInterval,
    moveTimer: 1,
    targetX: 0,
  });
}

/** A simple glass duelist: faceted torso gem + a head orb. */
function buildOpponentBody(): Group {
  const group = new Group();
  group.name = 'opponent';

  const torsoGeo = new IcosahedronGeometry(COMBAT.dummyHitboxRadius, 0);
  const torso = new Mesh(
    torsoGeo,
    makeGlass({ color: PALETTE.magenta, emissive: PALETTE.magenta, emissiveIntensity: 0.7, thickness: 0.6 }),
  );
  torso.add(neonEdges(torsoGeo, PALETTE.magenta));
  group.add(torso);

  const headGeo = new SphereGeometry(0.16, 20, 16);
  const head = new Mesh(headGeo, makeGlass({ color: PALETTE.violet, emissive: PALETTE.violet, emissiveIntensity: 0.8 }));
  head.position.set(0, 0.42, 0);
  group.add(head);

  return group;
}
