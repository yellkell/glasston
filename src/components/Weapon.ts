/**
 * A wieldable weapon. `type` indexes the archetype registry (see weapons/archetypes).
 * Ammo and cooldown drive the constant swap rhythm; `homeSlot` is the pedestal it
 * returns to when released.
 */

import { createComponent, Types } from '@iwsdk/core';

export const Weapon = createComponent(
  'Weapon',
  {
    type: { type: Types.Int32, default: 0 },
    ammo: { type: Types.Int32, default: 0 },
    maxAmmo: { type: Types.Int32, default: 0 },
    cooldown: { type: Types.Float32, default: 0.25 },
    cooldownRemaining: { type: Types.Float32, default: 0 },
    /** Index into PEDESTAL_SLOTS this weapon belongs to. */
    homeSlot: { type: Types.Int32, default: 0 },
  },
  'A wieldable weapon with ammo and cooldown.',
);
