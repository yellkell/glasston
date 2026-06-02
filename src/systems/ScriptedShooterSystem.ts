/**
 * Phase-3 placeholder opponent: fires a slow, slightly-inaccurate shot at the
 * player's current head position on a fixed cadence, so body-dodging can be
 * tested. The real, mobile AI opponent replaces this in Phase 5.
 */

import { createSystem, Vector3 } from '@iwsdk/core';
import { spawnProjectile } from '../combat/spawnProjectile.js';
import { ARENA_GAP, PALETTE, SCRIPTED_SHOOTER } from '../config.js';

const _target = new Vector3();
const _dir = new Vector3();
// Muzzle: roughly chest height on the opponent platform.
const SOURCE = new Vector3(0, 1.4, -ARENA_GAP);

export class ScriptedShooterSystem extends createSystem({}) {
  private timer = SCRIPTED_SHOOTER.interval;

  update(delta: number): void {
    this.timer -= delta;
    if (this.timer > 0) return;
    this.timer = SCRIPTED_SHOOTER.interval;

    const head = this.playerHeadEntity?.object3D;
    if (!head) return;
    head.getWorldPosition(_target);

    // Add aim jitter so the shot is readable and dodge-able, not a guaranteed hit.
    _target.x += (Math.random() - 0.5) * 2 * SCRIPTED_SHOOTER.aimJitter;
    _target.y += (Math.random() - 0.5) * 2 * SCRIPTED_SHOOTER.aimJitter;

    _dir.copy(_target).sub(SOURCE);

    spawnProjectile(this.world, {
      position: SOURCE.clone(),
      direction: _dir,
      speed: SCRIPTED_SHOOTER.speed,
      owner: 1,
      damage: SCRIPTED_SHOOTER.damage,
      color: PALETTE.magenta,
    });
  }
}
