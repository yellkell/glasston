/**
 * Present on a weapon that has been let go and is falling to the floor. It
 * carries its own world-space velocity (so it can be tossed, not just dropped
 * straight down) and despawns when it lands — see WeaponSystem.
 */

import { createComponent, Types } from '@iwsdk/core';

export const Dropped = createComponent(
  'Dropped',
  {
    /** World-space velocity in m/s. */
    velocity: { type: Types.Vec3, default: [0, 0, 0] as [number, number, number] },
  },
  'A released weapon falling to the floor.',
);
