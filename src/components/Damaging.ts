/** Marks a projectile that deals damage on contact. */

import { createComponent, Types } from '@iwsdk/core';

export const Damaging = createComponent(
  'Damaging',
  {
    damage: { type: Types.Float32, default: 10 },
  },
  'Deals damage to a hit combatant.',
);
