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
import { Dropped } from '../components/Dropped.js';
import { Pedestal } from '../components/Pedestal.js';
import { spawnProjectile } from '../combat/spawnProjectile.js';
import { spawnMuzzleFlash, spawnImpact } from '../fx/effects.js';
import { getAmmoBadge, getArchetype } from '../weapons/archetypes.js';
import { pulseHand } from '../input/haptics.js';
import { DROP, PALETTE, WEAPON } from '../config.js';

const HANDS = ['left', 'right'] as const;
const FORWARD = new Vector3(0, 0, -1);

const _muzzle = new Vector3();
const _forward = new Vector3();
const _dir = new Vector3();
const _euler = new Euler();

export class WeaponSystem extends createSystem({
  weapons: { required: [Weapon] },
  // Declaring Dropped in a query also registers the component with the ECS,
  // which is what makes hasComponent/getVectorView for it valid elsewhere.
  dropped: { required: [Weapon, Dropped] },
  pedestals: { required: [Pedestal] },
}) {
  update(delta: number): void {
    // Let-go weapons fall and despawn when they land.
    for (const weapon of [...this.queries.dropped.entities]) {
      this.updateDropped(weapon, delta);
    }

    for (const weapon of [...this.queries.weapons.entities]) {
      const cd = Math.max(0, (weapon.getValue(Weapon, 'cooldownRemaining') ?? 0) - delta);
      weapon.setValue(Weapon, 'cooldownRemaining', cd);

      // Held weapons only past here; parked + falling weapons have no HeldBy.
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

  /**
   * Hold the weapon at the hand's grip position, but aim it along the hand's
   * *ray* (pointing) direction so the barrel points FORWARD where you aim —
   * the grip space's own forward axis points up out of the controller, which
   * is why the gun used to point at the ceiling.
   */
  private followHand(weapon: import('@iwsdk/core').Entity, hand: 'left' | 'right'): void {
    const spaces = this.world.playerSpaceEntities;
    const grip = spaces.gripSpaces[hand]?.object3D;
    const obj = weapon.object3D;
    if (!grip || !obj) return;
    const ray = spaces.raySpaces[hand]?.object3D ?? grip;
    grip.getWorldPosition(obj.position);
    ray.getWorldQuaternion(obj.quaternion);
  }

  /** Apply gravity to a dropped weapon; despawn (with a poof) when it lands. */
  private updateDropped(weapon: import('@iwsdk/core').Entity, delta: number): void {
    const obj = weapon.object3D;
    if (!obj) return;

    const v = weapon.getVectorView(Dropped, 'velocity'); // Float32Array [x,y,z]
    v[1] -= DROP.gravity * delta;
    obj.position.x += v[0] * delta;
    obj.position.y += v[1] * delta;
    obj.position.z += v[2] * delta;
    obj.rotateZ(DROP.spin * delta); // a little tumble

    if (obj.position.y <= DROP.floorY) {
      obj.position.y = DROP.floorY;
      spawnImpact(this.world, obj.position.clone(), PALETTE.purple);
      this.freePedestal(weapon.getValue(Weapon, 'homeSlot') ?? 0);
      weapon.destroy();
    }
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
    this.freePedestal(weapon.getValue(Weapon, 'homeSlot') ?? 0);
    weapon.destroy();
  }

  /** Mark a pedestal empty so WeaponSpawnSystem restocks it after the delay. */
  private freePedestal(home: number): void {
    for (const pedestal of this.queries.pedestals.entities) {
      if ((pedestal.getValue(Pedestal, 'slot') ?? -1) === home) {
        pedestal.setValue(Pedestal, 'occupied', false);
        pedestal.setValue(Pedestal, 'respawnTimer', WEAPON.respawnDelay);
        break;
      }
    }
  }

  /**
   * Buzz the controller in `hand`. Resolved live from the session by
   * handedness (see input/haptics) so the pulse can only ever reach the
   * controller that actually fired.
   */
  private haptic(hand: 'left' | 'right'): void {
    pulseHand(this.world.session, hand);
  }
}
