/**
 * A weapon-spawn pedestal at a fixed slot around the player's platform rim.
 * `occupied` is true while a weapon is associated with it (parked or held);
 * once a weapon is spent it frees up and respawns after `respawnTimer`.
 */

import { createComponent, Types } from '@iwsdk/core';

export const Pedestal = createComponent(
  'Pedestal',
  {
    slot: { type: Types.Int32, default: 0 },
    occupied: { type: Types.Boolean, default: false },
    respawnTimer: { type: Types.Float32, default: 0 },
  },
  'A weapon-spawn pedestal slot.',
);
