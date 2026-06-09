/**
 * Gives the cat opponent life through squash-and-stretch, layered on top of the
 * AI's position/facing each frame:
 *  - idle breathing + a gentle bob,
 *  - a wind-up "tell" in the last moments before it fires (squashes down) so a
 *    sharp player can read the shot and dodge — then a recoil pop on release,
 *  - a quick flinch when it takes a hit.
 *
 * Purely visual: the Hitbox radius is fixed, so scaling never changes how hard
 * the cat is to hit. Runs only during a live match.
 */

import { createSystem, type Entity, type Group } from '@iwsdk/core';
import { AIController } from '../components/AIController.js';
import { Health } from '../components/Health.js';
import { app } from '../menu/appState.js';
import { AI } from '../config.js';
import { applyExpression, type Expression } from '../character/expressions.js';

interface AnimState {
  t: number;
  prevFire: number;
  prevHp: number;
  recoil: number; // 0..1, decays after a shot
  flinch: number; // 0..1, decays after a hit
  expression: Expression;
}

const WINDUP = 0.32; // seconds of tell before a shot

export class OpponentAnimSystem extends createSystem({
  opponents: { required: [AIController, Health] },
}) {
  private state = new Map<Entity, AnimState>();

  update(delta: number): void {
    if (app.state !== 'playing') return;

    for (const e of this.queries.opponents.entities) {
      const obj = e.object3D;
      if (!obj) continue;

      let s = this.state.get(e);
      if (!s) {
        s = {
          t: 0,
          prevFire: 0,
          prevHp: e.getValue(Health, 'current') ?? 100,
          recoil: 0,
          flinch: 0,
          expression: 'neutral',
        };
        this.state.set(e, s);
      }
      s.t += delta;

      // Fire detection: AISystem resets fireTimer to a large value right after a
      // shot, so a jump upward means "just fired" → recoil pop.
      const fire = e.getValue(AIController, 'fireTimer') ?? 1;
      if (fire > s.prevFire + 0.01) s.recoil = 1;
      s.prevFire = fire;

      // Hit detection: health dropped since last frame → flinch.
      const hp = e.getValue(Health, 'current') ?? 100;
      if (hp < s.prevHp - 0.01) s.flinch = 1;
      s.prevHp = hp;

      s.recoil = Math.max(0, s.recoil - delta * 5);
      s.flinch = Math.max(0, s.flinch - delta * 4);

      // Idle.
      const breathe = 1 + Math.sin(s.t * 2.3) * 0.025;
      obj.position.y = AI.bodyY + Math.sin(s.t * 2.3) * 0.02;

      // Wind-up squash (ramps as the shot approaches), recoil pop, hit flinch.
      const windup = fire < WINDUP ? (WINDUP - fire) / WINDUP : 0;
      const sy = breathe * (1 - 0.14 * windup + 0.12 * s.recoil - 0.14 * s.flinch);
      const sxz = breathe * (1 + 0.1 * windup - 0.06 * s.recoil + 0.1 * s.flinch);
      obj.scale.set(sxz, sy, sxz);

      // Facial expression layered on the same cues: shock when hit, focus
      // during the wind-up tell, a happy grin right after firing.
      const expression: Expression =
        s.flinch > 0.25 ? 'surprised' : windup > 0.2 ? 'determined' : s.recoil > 0.45 ? 'happy' : 'neutral';
      if (expression !== s.expression) {
        s.expression = expression;
        applyExpression(obj as Group, expression);
      }
    }
  }
}
