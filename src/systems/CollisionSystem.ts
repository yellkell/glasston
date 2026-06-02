/**
 * Sphere-vs-sphere collision between projectiles and combatant hitboxes.
 *
 * A projectile only damages a hitbox on the opposing team (so shots never hit
 * their own shooter). Damage is applied to the entity referenced by the hitbox's
 * `owner` (its shared Health pool), so a multi-sphere IK body drains one pool.
 * A combatant at 0 HP is destroyed (a stand-in "shatter" until Phase 6 FX) —
 * except the player, whose game-over flow arrives in Phase 5.
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
  hitboxes: { required: [Hitbox] },
}) {
  update(): void {
    const hitboxes = [...this.queries.hitboxes.entities];
    if (hitboxes.length === 0) return;

    // Snapshot projectiles: a hit destroys the entity mid-loop.
    for (const proj of [...this.queries.projectiles.entities]) {
      const projObj = proj.object3D;
      if (!projObj) continue;
      projObj.getWorldPosition(_projPos);

      const owner = proj.getValue(Projectile, 'owner') ?? 0;
      const projRadius = proj.getValue(Projectile, 'radius') ?? 0.045;
      const damage = proj.getValue(Damaging, 'damage') ?? 0;

      for (const hitbox of hitboxes) {
        const team = hitbox.getValue(Hitbox, 'team') ?? 0;
        if (team === owner) continue; // can't hit your own side

        const hbObj = hitbox.object3D;
        if (!hbObj) continue;
        hbObj.getWorldPosition(_targetPos);

        const hitRadius = hitbox.getValue(Hitbox, 'radius') ?? 0.25;
        const reach = projRadius + hitRadius;
        if (_projPos.distanceToSquared(_targetPos) <= reach * reach) {
          const combatant = (hitbox.getValue(Hitbox, 'owner') as Entity | null) ?? hitbox;
          this.applyDamage(combatant, team, damage);
          proj.destroy();
          break; // projectile is spent
        }
      }
    }
  }

  private applyDamage(combatant: Entity, team: number, damage: number): void {
    if (!combatant.active || !combatant.hasComponent(Health)) return;
    const current = combatant.getValue(Health, 'current') ?? 0;
    const next = current - damage;

    if (next <= 0) {
      combatant.setValue(Health, 'current', 0);
      if (team === 0) {
        // Player is down — game-over flow arrives in Phase 5.
        // eslint-disable-next-line no-console
        console.info('[Glasston] Player down.');
      } else {
        combatant.destroy(); // target shatters (FX in Phase 6)
      }
    } else {
      combatant.setValue(Health, 'current', next);
    }
  }
}
