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
    let targetY = opp.getValue(AIController, 'targetY') ?? AI.bodyY;
    let moveTimer = (opp.getValue(AIController, 'moveTimer') ?? 0) - delta;

    if (moveTimer <= 0) {
      // More varied movement: horizontal strafe + vertical duck/stand
      const movePattern = Math.random();
      
      // Horizontal movement
      if (movePattern < 0.15) {
        // 15% chance: stay near current position (small adjustment)
        targetX = obj.position.x + (Math.random() * 0.4 - 0.2);
      } else if (movePattern < 0.35) {
        // 20% chance: move toward center
        targetX = (Math.random() * 0.6 - 0.3);
      } else if (movePattern < 0.55) {
        // 20% chance: move to edges
        targetX = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.2) * AI.padHalfWidth;
      } else {
        // 45% chance: random position across pad
        targetX = (Math.random() * 2 - 1) * AI.padHalfWidth;
      }
      targetX = clamp(targetX, -AI.padHalfWidth, AI.padHalfWidth);
      
      // Vertical movement (ducking)
      const duckPattern = Math.random();
      if (duckPattern < 0.25) {
        // 25% chance: duck low
        targetY = AI.bodyYMin + Math.random() * 0.15;
      } else if (duckPattern < 0.45) {
        // 20% chance: crouch medium
        targetY = AI.bodyY - 0.2 + Math.random() * 0.15;
      } else if (duckPattern < 0.60) {
        // 15% chance: stand tall
        targetY = AI.bodyYMax - Math.random() * 0.1;
      } else {
        // 40% chance: normal height with slight variation
        targetY = AI.bodyY + (Math.random() * 0.2 - 0.1);
      }
      targetY = clamp(targetY, AI.bodyYMin, AI.bodyYMax);
      
      // Vary the timing more: quick darts vs. patient holds
      moveTimer = Math.random() < 0.3 ? 0.4 + Math.random() * 0.5 : 1.0 + Math.random() * 1.2;
    }

    // Reactive dodge: if a player shot is close, step away horizontally AND duck/jump
    obj.getWorldPosition(_opp);
    for (const p of this.queries.projectiles.entities) {
      if ((p.getValue(Projectile, 'owner') ?? 0) !== 0) continue;
      const pobj = p.object3D;
      if (!pobj) continue;
      pobj.getWorldPosition(_proj);
      if (_proj.distanceTo(_opp) < AI.reactDistance) {
        // Horizontal dodge
        const away = Math.sign(_opp.x - _proj.x) || 1;
        targetX = clamp(_opp.x + away * 0.6, -AI.padHalfWidth, AI.padHalfWidth);
        
        // Vertical dodge based on projectile height
        if (_proj.y < AI.bodyY - 0.2) {
          // Shot is low - stand tall or jump
          targetY = AI.bodyYMax;
        } else if (_proj.y > AI.bodyY + 0.2) {
          // Shot is high - duck
          targetY = AI.bodyYMin;
        } else {
          // Shot is mid-height - duck or dodge to side
          targetY = Math.random() < 0.6 ? AI.bodyYMin : AI.bodyY - 0.15;
        }
        break;
      }
    }

    opp.setValue(AIController, 'targetX', targetX);
    opp.setValue(AIController, 'targetY', targetY);
    opp.setValue(AIController, 'moveTimer', moveTimer);

    // Move toward target position (horizontal)
    const stepX = AI.moveSpeed * delta;
    const dx = targetX - obj.position.x;
    obj.position.x += Math.abs(dx) <= stepX ? dx : Math.sign(dx) * stepX;
    
    // Move toward target height (vertical) - faster for quick ducks
    const stepY = AI.duckSpeed * delta;
    const dy = targetY - obj.position.y;
    obj.position.y += Math.abs(dy) <= stepY ? dy : Math.sign(dy) * stepY;
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
