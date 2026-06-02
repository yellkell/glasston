/**
 * A spherical hit volume on a combatant. `team` decides what can hurt it:
 * a projectile only damages entities whose team differs from the shooter's owner
 * (0 = player side, 1 = opponent side).
 */

import { createComponent, Types } from '@iwsdk/core';

export const Hitbox = createComponent(
  'Hitbox',
  {
    radius: { type: Types.Float32, default: 0.25 },
    team: { type: Types.Int32, default: 0 },
  },
  'Spherical hit volume for collision.',
);
