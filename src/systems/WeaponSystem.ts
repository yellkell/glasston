/**
 * Drives held weapons each frame:
 *  - locks a held weapon to its hand's grip pose (so it aims like a gun);
 *  - ticks cooldowns;
 *  - fires the weapon's pattern (single / spread / heavy) on the trigger,
 *    decrements ammo and updates the floating ammo badge;
 *  - when a weapon runs dry it dissolves and frees its pedestal to respawn.
 */

import { createSystem, Euler, InputComponent, Vector3 } from '@iwsdk/core';
import { Weapon } from '../components/Weapon.js';
import { HeldBy } from '../components/HeldBy.js';
import { Pedestal } from '../components/Pedestal.js';
import { spawnProjectile } from '../combat/spawnProjectile.js';
import { spawnMuzzleFlash } from '../fx/effects.js';
import { getAmmoBadge, getArchetype } from '../weapons/archetypes.js';
import { WEAPON } from '../config.js';

const HANDS = ['left', 'right'] as const;
const FORWARD = new Vector3(0, 0, -1);

const _muzzle = new Vector3();
const _forward = new Vector3();
const _dir = new Vector3();
const _euler = new Euler();

export class WeaponSystem extends createSystem({
  weapons: { required: [Weapon] },
  pedestals: { required: [Pedestal] },
}) {
  update(delta: number): void {
    for (const weapon of [...this.queries.weapons.entities]) {
      const cd = Math.max(0, (weapon.getValue(Weapon, 'cooldownRemaining') ?? 0) - delta);
      weapon.setValue(Weapon, 'cooldownRemaining', cd);

      if (!weapon.hasComponent(HeldBy)) continue;
      const hand = HANDS[weapon.getValue(HeldBy, 'hand') ?? 1];
      this.followHand(weapon, hand);

      const gp = this.input.xr.gamepads[hand];
      if (!gp) continue;
      const arch = getArchetype(weapon.getValue(Weapon, 'type') ?? 0);
      const wantFire = arch.auto
        ? gp.getButtonPressed(InputComponent.Trigger)
        : gp.getButtonDown(InputComponent.Trigger);

      if (wantFire && cd <= 0 && (weapon.getValue(Weapon, 'ammo') ?? 0) > 0) {
        this.fire(weapon, arch, hand);
      }
    }
  }

  /** Lock the weapon to the hand's grip pose. */
  private followHand(weapon: import('@iwsdk/core').Entity, hand: 'left' | 'right'): void {
    const grip = this.world.playerSpaceEntities.gripSpaces[hand]?.object3D;
    const obj = weapon.object3D;
    if (!grip || !obj) return;
    grip.getWorldPosition(obj.position);
    grip.getWorldQuaternion(obj.quaternion);
  }

  private fire(
    weapon: import('@iwsdk/core').Entity,
    arch: ReturnType<typeof getArchetype>,
    hand: 'left' | 'right',
  ): void {
    const obj = weapon.object3D!;
    _forward.copy(FORWARD).applyQuaternion(obj.quaternion).normalize();
    _muzzle.copy(obj.position).addScaledVector(_forward, arch.barrelLen);

    const spreadRad = (arch.spreadDeg * Math.PI) / 180;
    for (let i = 0; i < arch.pellets; i++) {
      _dir.copy(_forward);
      if (spreadRad > 0) {
        _euler.set((Math.random() - 0.5) * 2 * spreadRad, (Math.random() - 0.5) * 2 * spreadRad, 0);
        _dir.applyEuler(_euler).normalize();
      }
      spawnProjectile(this.world, {
        position: _muzzle.clone(),
        direction: _dir,
        speed: arch.speed,
        owner: 0,
        damage: arch.damage,
        color: arch.color,
        radius: arch.radius,
      });
    }

    spawnMuzzleFlash(this.world, _muzzle, arch.color);

    const ammo = (weapon.getValue(Weapon, 'ammo') ?? 1) - 1;
    weapon.setValue(Weapon, 'ammo', ammo);
    weapon.setValue(Weapon, 'cooldownRemaining', weapon.getValue(Weapon, 'cooldown') ?? 0.25);
    getAmmoBadge(obj)?.set(ammo);
    this.haptic(hand);

    if (ammo <= 0) this.spend(weapon);
  }

  /** A spent weapon dissolves and frees its pedestal to respawn a fresh one. */
  private spend(weapon: import('@iwsdk/core').Entity): void {
    const home = weapon.getValue(Weapon, 'homeSlot') ?? 0;
    for (const pedestal of this.queries.pedestals.entities) {
      if ((pedestal.getValue(Pedestal, 'slot') ?? -1) === home) {
        pedestal.setValue(Pedestal, 'occupied', false);
        pedestal.setValue(Pedestal, 'respawnTimer', WEAPON.respawnDelay);
        break;
      }
    }
    weapon.destroy();
  }

  private haptic(hand: 'left' | 'right'): void {
    const gp = this.input.xr.gamepads[hand];
    const actuator = gp?.gamepad?.hapticActuators?.[0] as
      | (GamepadHapticActuator & { pulse?: (value: number, duration: number) => void })
      | undefined;
    actuator?.pulse?.(0.5, 70);
  }
}
