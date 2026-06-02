/**
 * Phase 2 shooting core.
 *
 * Reads each hand's trigger (edge-triggered) and, on press, spawns a slow
 * glass-orb projectile from that hand's aim ray. Both hands fire independently,
 * laying the groundwork for dual-wielding real weapons in Phase 4.
 */

import {
  createSystem,
  InputComponent,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
} from '@iwsdk/core';

type Hand = 'left' | 'right';
import { Projectile } from '../components/Projectile.js';
import { fakeGlass } from '../materials/glass.js';
import { PALETTE, PROJECTILE } from '../config.js';

// Reusable temporaries to avoid per-shot allocation.
const _pos = new Vector3();
const _quat = new Quaternion();
const _dir = new Vector3();
const FORWARD = new Vector3(0, 0, -1);

// Shared geometry for all player orbs (cheap; one buffer reused).
const ORB_GEO = new SphereGeometry(PROJECTILE.radius, 16, 16);

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

    const orb = new Mesh(
      ORB_GEO,
      fakeGlass({ color: PALETTE.cyan, emissive: PALETTE.cyan, emissiveIntensity: 3 }),
    );

    const entity = this.world.createTransformEntity(orb);
    entity.object3D!.position.copy(_pos).addScaledVector(_dir, PROJECTILE.muzzleOffset);
    entity.addComponent(Projectile, {
      velocity: [
        _dir.x * PROJECTILE.speed,
        _dir.y * PROJECTILE.speed,
        _dir.z * PROJECTILE.speed,
      ],
      lifetime: PROJECTILE.lifetime,
      radius: PROJECTILE.radius,
      owner: 0,
    });

    // A short rumble confirms the shot.
    gpHaptic(this, hand);
  }
}

/** Fire a brief haptic pulse on the firing controller, if supported. */
function gpHaptic(system: WeaponFireSystem, hand: Hand): void {
  const gp = system.input.xr.gamepads[hand];
  const actuator = gp?.gamepad?.hapticActuators?.[0] as
    | (GamepadHapticActuator & { pulse?: (value: number, duration: number) => void })
    | undefined;
  actuator?.pulse?.(0.4, 60);
}
