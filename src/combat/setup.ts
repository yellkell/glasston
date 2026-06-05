/**
 * Spawns the combatants:
 *  - the player "combatant" entity (shared Health) plus three head-driven IK
 *    body-part hitboxes (see PlayerBodySystem);
 *  - the AI opponent: a cute cat avatar across the room with Health, a Hitbox,
 *    and an AIController that aims, fires and dodges (see AISystem).
 *
 * The cat model lives in character/cat.ts so the opponent and the customizer
 * preview share one builder.
 */

import { Object3D, type World } from '@iwsdk/core';
import { Health } from '../components/Health.js';
import { Hitbox } from '../components/Hitbox.js';
import { Combatant } from '../components/Combatant.js';
import { AIController } from '../components/AIController.js';
import { BodyPart, PlayerBodyPart } from '../components/PlayerBodyPart.js';
import { AI, ARENA_GAP, BODY_IK, COMBAT } from '../config.js';
import { buildCat } from '../character/cat.js';
import { opponentSkin } from '../menu/skin.js';

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

  // --- AI opponent: a cute cat that moves, dodges and shoots ---
  const opponent = world.createTransformEntity(buildCat(opponentSkin), { persistent: true });
  opponent.object3D!.name = 'opponent';
  opponent.object3D!.position.set(0, AI.bodyY, -ARENA_GAP);
  opponent.object3D!.visible = false; // hidden in the lobby; MenuSystem reveals it on Play
  opponent.addComponent(Health, { current: COMBAT.dummyHealth, max: COMBAT.dummyHealth });
  opponent.addComponent(Combatant, { team: 1 });
  opponent.addComponent(Hitbox, { radius: COMBAT.dummyHitboxRadius, team: 1, owner: opponent });
  opponent.addComponent(AIController, {
    fireTimer: AI.fireInterval,
    moveTimer: 1,
    targetX: 0,
  });
}
