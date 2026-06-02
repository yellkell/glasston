/**
 * Phase 2 shooting core.
 *
 * Reads each hand's trigger (edge-triggered) and, on press, spawns a slow
 * glass-orb projectile from that hand's aim ray. Both hands fire independently,
 * laying the groundwork for dual-wielding real weapons in Phase 4.
 */

import { createSystem, InputComponent, Quaternion, Vector3 } from '@iwsdk/core';
import { spawnProjectile } from '../combat/spawnProjectile.js';
import { PALETTE, PROJECTILE } from '../config.js';

type Hand = 'left' | 'right';

// Reusable temporaries to avoid per-shot allocation.
const _pos = new Vector3();
const _quat = new Quaternion();
const _dir = new Vector3();
const FORWARD = new Vector3(0, 0, -1);

export class WeaponFireSystem extends createSystem({}) {
  update(): void {
    const gamepads = this.input.xr.gamepads;
    for (const hand of ['left', 'right'] as const) {
      const gp = gamepads[hand];
      if (gp && gp.getButtonDown(InputComponent.Trigger)) {
        this.fire(hand);
      }
    }
  }

  private fire(hand: Hand): void {
    // Aim from the controller's ray space (where it points), in world space.
    const raySpace = this.world.playerSpaceEntities.raySpaces[hand];
    const obj = raySpace?.object3D;
    if (!obj) return;

    obj.getWorldPosition(_pos);
    obj.getWorldQuaternion(_quat);
    _dir.copy(FORWARD).applyQuaternion(_quat).normalize();
    _pos.addScaledVector(_dir, PROJECTILE.muzzleOffset);

    spawnProjectile(this.world, {
      position: _pos,
      direction: _dir,
      speed: PROJECTILE.speed,
      owner: 0,
      damage: PROJECTILE.damage,
      color: PALETTE.cyan,
      radius: PROJECTILE.radius,
      lifetime: PROJECTILE.lifetime,
    });

    this.haptic(hand);
  }

  /** Brief rumble on the firing controller, if supported. */
  private haptic(hand: Hand): void {
    const gp = this.input.xr.gamepads[hand];
    const actuator = gp?.gamepad?.hapticActuators?.[0] as
      | (GamepadHapticActuator & { pulse?: (value: number, duration: number) => void })
      | undefined;
    actuator?.pulse?.(0.4, 60);
  }
}
