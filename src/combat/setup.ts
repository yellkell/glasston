/**
 * Spawns the combatants:
 *  - the player "combatant" entity (shared Health) plus three head-driven IK
 *    body-part hitboxes (see PlayerBodySystem);
 *  - the AI opponent: a cute cat-like avatar across the room with Health, a
 *    Hitbox, and an AIController that aims, fires and dodges (see AISystem).
 */

import {
  ConeGeometry,
  Group,
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
import { makeGlass } from '../materials/glass.js';

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

/**
 * A cute cat-like duelist: a rounded white body, a big head with triangular
 * pink-lined ears, simple dark eyes and a little pink nose. Glossy toy-plastic
 * throughout. The group origin sits at the chest so it lines up with the Hitbox.
 */
function buildOpponentBody(): Group {
  const group = new Group();
  group.name = 'opponent';

  const furWhite = () => makeGlass({ color: PALETTE.white, roughness: 0.45, emissiveIntensity: 0.06 });
  const pink = () => makeGlass({ color: PALETTE.pink, roughness: 0.4, emissive: PALETTE.pink, emissiveIntensity: 0.3 });

  // Body — a slightly squashed sphere ~ the hitbox size.
  const r = COMBAT.dummyHitboxRadius;
  const body = new Mesh(new SphereGeometry(r, 24, 20), furWhite());
  body.scale.set(1, 1.1, 1);
  group.add(body);

  // Head — large and round, sat above the body.
  const headR = r * 0.78;
  const headY = r * 1.25;
  const head = new Mesh(new SphereGeometry(headR, 24, 20), furWhite());
  head.position.set(0, headY, 0);
  group.add(head);

  // Ears — two cones, pink inner cones nested inside white outers.
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(headR * 0.42, headR * 0.7, 4), furWhite());
    ear.position.set(side * headR * 0.55, headY + headR * 0.78, 0);
    ear.rotation.z = side * -0.25;
    const inner = new Mesh(new ConeGeometry(headR * 0.24, headR * 0.5, 4), pink());
    inner.position.set(0, -headR * 0.02, 0.02);
    ear.add(inner);
    group.add(ear);
  }

  // Eyes — small dark glossy beads on the front of the face (-z faces player).
  const eyeMat = makeGlass({ color: 0x2a2440, roughness: 0.15, emissiveIntensity: 0 });
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(headR * 0.16, 16, 12), eyeMat);
    eye.position.set(side * headR * 0.34, headY + headR * 0.08, -headR * 0.92);
    group.add(eye);
  }

  // Nose — a tiny pink muzzle bump.
  const nose = new Mesh(new SphereGeometry(headR * 0.1, 12, 10), pink());
  nose.position.set(0, headY - headR * 0.18, -headR * 0.98);
  group.add(nose);

  // Cheeks — soft pink blush spots.
  const blush = () => makeGlass({ color: PALETTE.pink, roughness: 0.5, emissive: PALETTE.pink, emissiveIntensity: 0.5 });
  for (const side of [-1, 1]) {
    const cheek = new Mesh(new SphereGeometry(headR * 0.13, 12, 10), blush());
    cheek.scale.set(1, 0.6, 0.5);
    cheek.position.set(side * headR * 0.6, headY - headR * 0.12, -headR * 0.82);
    group.add(cheek);
  }

  return group;
}
