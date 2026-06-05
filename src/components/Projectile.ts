/**
 * A fired glass-orb projectile: it travels in a straight line at constant
 * velocity until its lifetime runs out (or, in a later phase, it hits something).
 */

import { createComponent, Types } from '@iwsdk/core';

export const Projectile = createComponent(
  'Projectile',
  {
    /** World-space velocity in m/s. */
    velocity: { type: Types.Vec3, default: [0, 0, 0] as [number, number, number] },
    /** Seconds before the projectile despawns. */
    lifetime: { type: Types.Float32, default: 4 },
    /** Seconds elapsed since spawn. */
    elapsed: { type: Types.Float32, default: 0 },
    /** Collision radius (used from Phase 3 onward). */
    radius: { type: Types.Float32, default: 0.045 },
    /** Who fired it: 0 = player, 1 = opponent. Shots ignore their owner. */
    owner: { type: Types.Int32, default: 0 },
    /** Constant world-space acceleration (m/s²) — curves the path for curve weapons. */
    curve: { type: Types.Vec3, default: [0, 0, 0] as [number, number, number] },
  },
  'A fired projectile travelling at constant velocity.',
);
