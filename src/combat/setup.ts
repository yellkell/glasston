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
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
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
 * The kawaii cat duelist from the "Play BLASTO!" poster: a fluffy white body and
 * a big round head with tall pink-lined ears, huge sparkly eyes, a little pink
 * nose and a happy open mouth, plus stubby paws. Glossy toy-plastic throughout.
 * The group origin sits at the chest so it lines up with the Hitbox. The face
 * is built on +Z because Object3D.lookAt aims a mesh's +Z at its target, so
 * once the AI turns to face you the +Z side is what you see.
 */
function buildOpponentBody(): Group {
  const group = new Group();
  group.name = 'opponent';

  const fur = () => makeGlass({ color: PALETTE.white, roughness: 0.5, emissiveIntensity: 0.05 });
  const pink = () => makeGlass({ color: PALETTE.pink, roughness: 0.4, emissive: PALETTE.pink, emissiveIntensity: 0.35 });
  const dark = () => makeGlass({ color: 0x2a2336, roughness: 0.08, emissiveIntensity: 0 }); // glossy eyes
  const shine = () => new MeshBasicMaterial({ color: 0xffffff }); // unlit eye sparkle

  const r = COMBAT.dummyHitboxRadius;

  // Body — a soft, slightly squashed snowball.
  const body = new Mesh(new SphereGeometry(r, 28, 22), fur());
  body.scale.set(1, 1.05, 0.95);
  group.add(body);

  // Stubby paws at the sides, nudged forward (+Z) as if holding a blaster.
  for (const side of [-1, 1]) {
    const paw = new Mesh(new SphereGeometry(r * 0.26, 14, 12), fur());
    paw.position.set(side * r * 0.92, -r * 0.15, r * 0.35);
    group.add(paw);
  }

  // Head — big and round (kawaii proportions), sat just above the body.
  const headR = r * 0.92;
  const headY = r * 1.15;
  const head = new Mesh(new SphereGeometry(headR, 28, 22), fur());
  head.position.set(0, headY, 0);
  head.scale.set(1.05, 1, 0.98);
  group.add(head);

  // Ears — tall pink-lined triangles, smoothed and tilted outward.
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(headR * 0.4, headR * 0.95, 18), fur());
    ear.scale.set(1, 1, 0.45); // flatten front-to-back into a real ear
    ear.position.set(side * headR * 0.52, headY + headR * 0.86, headR * 0.05);
    ear.rotation.set(0.12, 0, side * -0.22);
    const inner = new Mesh(new ConeGeometry(headR * 0.22, headR * 0.62, 16), pink());
    inner.position.set(0, -headR * 0.04, headR * 0.06);
    ear.add(inner);
    group.add(ear);
  }

  // Eyes — big glossy dark ovals with a bright sparkle, facing the player (+Z).
  const eyeZ = headR * 0.9;
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(headR * 0.26, 18, 16), dark());
    eye.scale.set(0.85, 1.1, 0.7);
    eye.position.set(side * headR * 0.36, headY + headR * 0.06, eyeZ);
    group.add(eye);

    const spark = new Mesh(new SphereGeometry(headR * 0.07, 10, 8), shine());
    spark.position.set(side * headR * 0.42, headY + headR * 0.16, eyeZ + headR * 0.12);
    group.add(spark);
  }

  // Nose — a tiny pink muzzle bump.
  const nose = new Mesh(new SphereGeometry(headR * 0.1, 12, 10), pink());
  nose.position.set(0, headY - headR * 0.16, headR * 1.0);
  group.add(nose);

  // Happy open mouth — a small dark oval with a pink tongue tucked in.
  const mouth = new Mesh(new SphereGeometry(headR * 0.12, 14, 12), dark());
  mouth.scale.set(1.1, 0.7, 0.5);
  mouth.position.set(0, headY - headR * 0.34, headR * 0.92);
  group.add(mouth);
  const tongue = new Mesh(new SphereGeometry(headR * 0.07, 12, 10), pink());
  tongue.scale.set(1, 0.6, 0.6);
  tongue.position.set(0, headY - headR * 0.4, headR * 0.92);
  group.add(tongue);

  // Rosy cheeks — soft pink blush rings on the lower face.
  for (const side of [-1, 1]) {
    const cheek = new Mesh(new TorusGeometry(headR * 0.12, headR * 0.04, 8, 16), pink());
    cheek.position.set(side * headR * 0.62, headY - headR * 0.16, headR * 0.78);
    cheek.rotation.x = Math.PI / 2;
    group.add(cheek);
  }

  return group;
}
