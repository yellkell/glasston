/**
 * Custom grab for weapons: squeeze the grip near a parked weapon to pick it up,
 * release the grip to return it to its pedestal. A weapon locks to the hand
 * (see WeaponSystem's follow step) so it behaves like a gun, not a free-floating
 * manipulable — which is why we don't use IWSDK's general-purpose GrabSystem here.
 */

import { createSystem, InputComponent, Vector3 } from '@iwsdk/core';
import { Weapon } from '../components/Weapon.js';
import { Grabbable } from '../components/Grabbable.js';
import { HeldBy } from '../components/HeldBy.js';
import { Dropped } from '../components/Dropped.js';
import { app } from '../menu/appState.js';
import { GRAB } from '../config.js';

type Hand = 'left' | 'right';
const HAND_INDEX: Record<Hand, number> = { left: 0, right: 1 };

const _grip = new Vector3();
const _wpos = new Vector3();

export class GrabSystem extends createSystem({
  parked: { required: [Weapon, Grabbable], excluded: [HeldBy] },
  held: { required: [Weapon, HeldBy] },
}) {
  update(): void {
    if (app.state !== 'playing') return; // no grabbing in the lobby
    const gamepads = this.input.xr.gamepads;
    for (const hand of ['left', 'right'] as const) {
      const gp = gamepads[hand];
      if (!gp) continue;
      if (gp.getButtonDown(InputComponent.Squeeze)) this.tryGrab(hand);
      if (gp.getButtonUp(InputComponent.Squeeze)) this.release(hand);
    }
  }

  private tryGrab(hand: Hand): void {
    const gripObj = this.world.playerSpaceEntities.gripSpaces[hand]?.object3D;
    if (!gripObj) return;
    gripObj.getWorldPosition(_grip);

    let nearest: import('@iwsdk/core').Entity | undefined;
    let nearestDist = GRAB.radius * GRAB.radius;
    for (const weapon of this.queries.parked.entities) {
      if (weapon.hasComponent(HeldBy)) continue; // already taken this frame
      const obj = weapon.object3D;
      if (!obj) continue;
      obj.getWorldPosition(_wpos);
      const d = _wpos.distanceToSquared(_grip);
      if (d <= nearestDist) {
        nearestDist = d;
        nearest = weapon;
      }
    }
    if (nearest) {
      nearest.addComponent(HeldBy, { hand: HAND_INDEX[hand] });
    }
  }

  private release(hand: Hand): void {
    const handIdx = HAND_INDEX[hand];
    for (const weapon of [...this.queries.held.entities]) {
      if ((weapon.getValue(HeldBy, 'hand') ?? -1) !== handIdx) continue;
      weapon.removeComponent(HeldBy);
      // Let it go: it falls under gravity and despawns when it lands (see
      // WeaponSystem). Drop Grabbable so it can't be re-grabbed mid-air; a
      // small toss gives the drop some life. It still blocks enemy balls.
      weapon.removeComponent(Grabbable);
      weapon.addComponent(Dropped, {
        velocity: [(Math.random() - 0.5) * 0.4, -0.2, (Math.random() - 0.5) * 0.4],
      });
    }
  }
}
