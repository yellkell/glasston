/**
 * Drives the AI opponent: strafes along its pad, reactively dodges incoming
 * player shots, faces the player, and fires inaccurate (dodge-able) shots on a
 * cadence. Only fires while the match is being played.
 */

import { createSystem, Vector3 } from '@iwsdk/core';
import { AIController } from '../components/AIController.js';
import { Projectile } from '../components/Projectile.js';
import { spawnProjectile } from '../combat/spawnProjectile.js';
import { match } from '../combat/matchState.js';
import { app } from '../menu/appState.js';
import { AI, PALETTE } from '../config.js';

const _head = new Vector3();
const _opp = new Vector3();
const _proj = new Vector3();
const _dir = new Vector3();

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export class AISystem extends createSystem({
  ai: { required: [AIController] },
  projectiles: { required: [Projectile] },
}) {
  update(delta: number): void {
    if (app.state !== 'playing') return; // dormant in the lobby
    const headObj = this.playerHeadEntity?.object3D;
    if (!headObj) return;
    headObj.getWorldPosition(_head);

    for (const opp of this.queries.ai.entities) {
      const obj = opp.object3D;
      if (!obj) continue;
      this.move(opp, obj, delta);
      obj.lookAt(_head.x, obj.position.y, _head.z);
      if (match.phase === 'playing') this.maybeFire(opp, obj, delta);
    }
  }

  private move(opp: import('@iwsdk/core').Entity, obj: import('@iwsdk/core').Entity['object3D'] & object, delta: number): void {
    let targetX = opp.getValue(AIController, 'targetX') ?? 0;
    let moveTimer = (opp.getValue(AIController, 'moveTimer') ?? 0) - delta;

    if (moveTimer <= 0) {
      targetX = (Math.random() * 2 - 1) * AI.padHalfWidth;
      moveTimer = 0.8 + Math.random() * 0.9;
    }

    // Reactive dodge: if a player shot is close, step away from its line.
    obj.getWorldPosition(_opp);
    for (const p of this.queries.projectiles.entities) {
      if ((p.getValue(Projectile, 'owner') ?? 0) !== 0) continue;
      const pobj = p.object3D;
      if (!pobj) continue;
      pobj.getWorldPosition(_proj);
      if (_proj.distanceTo(_opp) < AI.reactDistance) {
        const away = Math.sign(_opp.x - _proj.x) || 1;
        targetX = clamp(_opp.x + away * 0.6, -AI.padHalfWidth, AI.padHalfWidth);
        break;
      }
    }

    opp.setValue(AIController, 'targetX', targetX);
    opp.setValue(AIController, 'moveTimer', moveTimer);

    const step = AI.moveSpeed * delta;
    const dx = targetX - obj.position.x;
    obj.position.x += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
  }

  private maybeFire(opp: import('@iwsdk/core').Entity, obj: import('@iwsdk/core').Entity['object3D'] & object, delta: number): void {
    const t = (opp.getValue(AIController, 'fireTimer') ?? 0) - delta;
    if (t > 0) {
      opp.setValue(AIController, 'fireTimer', t);
      return;
    }
    opp.setValue(AIController, 'fireTimer', AI.fireInterval);

    obj.getWorldPosition(_opp);
    _dir.copy(_head).sub(_opp);
    _dir.x += (Math.random() - 0.5) * 2 * AI.aimError;
    _dir.y += (Math.random() - 0.5) * 2 * AI.aimError;

    spawnProjectile(this.world, {
      position: _opp.clone().addScaledVector(_dir.clone().normalize(), 0.4),
      direction: _dir,
      speed: AI.projectileSpeed,
      owner: 1,
      damage: AI.damage,
      color: PALETTE.pink,
    });
  }
}
