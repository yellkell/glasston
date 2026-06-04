/**
 * Sphere-vs-sphere collision between projectiles and combatant hitboxes.
 *
 * A projectile only damages a hitbox on the opposing team (so shots never hit
 * their own shooter). Damage is applied to the entity referenced by the hitbox's
 * `owner` (its shared Health pool), so a multi-sphere IK body drains one pool.
 * Health is clamped at 0; ending the round on a knockout is the GameStateSystem's
 * job, so combatant entities persist across rounds.
 */

import { createSystem, Vector3, type Entity } from '@iwsdk/core';
import { Projectile } from '../components/Projectile.js';
import { Damaging } from '../components/Damaging.js';
import { Hitbox } from '../components/Hitbox.js';
import { Health } from '../components/Health.js';
import { Weapon } from '../components/Weapon.js';
import { spawnImpact } from '../fx/effects.js';
import { BLOCK, PALETTE } from '../config.js';

const _projPos = new Vector3();
const _targetPos = new Vector3();
const _weaponPos = new Vector3();

export class CollisionSystem extends createSystem({
  projectiles: { required: [Projectile, Damaging] },
  hitboxes: { required: [Hitbox] },
  weapons: { required: [Weapon] },
}) {
  update(): void {
    const hitboxes = [...this.queries.hitboxes.entities];
    if (hitboxes.length === 0) return;
    const weapons = [...this.queries.weapons.entities];

    // Snapshot projectiles: a hit destroys the entity mid-loop.
    for (const proj of [...this.queries.projectiles.entities]) {
      const projObj = proj.object3D;
      if (!projObj) continue;
      projObj.getWorldPosition(_projPos);

      const owner = proj.getValue(Projectile, 'owner') ?? 0;
      const projRadius = proj.getValue(Projectile, 'radius') ?? 0.045;
      const damage = proj.getValue(Damaging, 'damage') ?? 0;

      // Blocking: a weapon (held or mid-drop) deflects an incoming enemy ball.
      // Only the opponent's shots are blockable — your own would otherwise be
      // destroyed by the very weapon that just fired them.
      if (owner === 1 && this.blockedByWeapon(weapons, projRadius)) {
        spawnImpact(this.world, _projPos, PALETTE.blue);
        proj.destroy();
        continue;
      }

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
          this.applyDamage(combatant, damage);
          spawnImpact(this.world, _projPos, owner === 0 ? PALETTE.blue : PALETTE.pink);
          proj.destroy();
          break; // projectile is spent
        }
      }
    }
  }

  /** True if any of our weapons sits within block range of `_projPos`. */
  private blockedByWeapon(weapons: Entity[], projRadius: number): boolean {
    const reach = projRadius + BLOCK.radius;
    const reachSq = reach * reach;
    for (const weapon of weapons) {
      const obj = weapon.object3D;
      if (!obj) continue;
      obj.getWorldPosition(_weaponPos);
      if (_projPos.distanceToSquared(_weaponPos) <= reachSq) return true;
    }
    return false;
  }

  private applyDamage(combatant: Entity, damage: number): void {
    if (!combatant.active || !combatant.hasComponent(Health)) return;
    const next = (combatant.getValue(Health, 'current') ?? 0) - damage;
    combatant.setValue(Health, 'current', Math.max(0, next));
  }
}
