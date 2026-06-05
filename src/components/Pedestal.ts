/**
 * A weapon-spawn slot at a fixed point around the player (the pedestal itself is
 * invisible — the weapon just floats there). `occupied` is true while a weapon
 * is associated with it (parked or held); `emptyOrder` stamps when it last freed
 * up so WeaponSpawnSystem can respawn empty slots in FIFO order, one at a time.
 */

import { createComponent, Types } from '@iwsdk/core';

export const Pedestal = createComponent(
  'Pedestal',
  {
    slot: { type: Types.Int32, default: 0 },
    occupied: { type: Types.Boolean, default: false },
    emptyOrder: { type: Types.Float32, default: 0 },
  },
  'A weapon-spawn slot.',
);
