/**
 * Sphere-vs-sphere collision between projectiles and combatant hitboxes.
 *
 * A projectile only damages a hitbox on the opposing team (so shots never hit
 * their own shooter). On a hit it applies damage, despawns the projectile, and
 * destroys the target when its health reaches zero (a stand-in "shatter" until
 * Phase 6 adds real FX).
 */

import { createSystem, Vector3, type Entity } from '@iwsdk/core';
import { Projectile } from '../components/Projectile.js';
import { Damaging } from '../components/Damaging.js';
import { Hitbox } from '../components/Hitbox.js';
import { Health } from '../components/Health.js';

const _projPos = new Vector3();
const _targetPos = new Vector3();

export class CollisionSystem extends createSystem({
  projectiles: { required: [Projectile, Damaging] },
  targets: { required: [Hitbox, Health] },
}) {
  update(): void {
    const targets = [...this.queries.targets.entities];
    if (targets.length === 0) return;

    // Snapshot projectiles: a hit destroys the entity mid-loop.
    for (const proj of [...this.queries.projectiles.entities]) {
      const projObj = proj.object3D;
      if (!projObj) continue;
      projObj.getWorldPosition(_projPos);

      const owner = proj.getValue(Projectile, 'owner') ?? 0;
      const projRadius = proj.getValue(Projectile, 'radius') ?? 0.045;
      const damage = proj.getValue(Damaging, 'damage') ?? 0;

      for (const target of targets) {
        const team = target.getValue(Hitbox, 'team') ?? 0;
        if (team === owner) continue; // can't hit your own side

        const targetObj = target.object3D;
        if (!targetObj) continue;
        targetObj.getWorldPosition(_targetPos);

        const hitRadius = target.getValue(Hitbox, 'radius') ?? 0.25;
        const reach = projRadius + hitRadius;
        if (_projPos.distanceToSquared(_targetPos) <= reach * reach) {
          this.applyDamage(target, damage);
          proj.destroy();
          break; // projectile is spent
        }
      }
    }
  }

  private applyDamage(target: Entity, damage: number): void {
    const current = target.getValue(Health, 'current') ?? 0;
    const next = current - damage;
    const team = target.getValue(Hitbox, 'team') ?? 0;

    if (next <= 0) {
      target.setValue(Health, 'current', 0);
      if (team === 0) {
        // Player is down — game-over flow arrives in Phase 5.
        // eslint-disable-next-line no-console
        console.info('[Glasston] Player down.');
      } else {
        // Target shatters (placeholder: remove it; FX in Phase 6).
        target.destroy();
      }
    } else {
      target.setValue(Health, 'current', next);
    }
  }
}
