/** Marks a duelist (holds the shared Health). team 0 = player, 1 = opponent. */

import { createComponent, Types } from '@iwsdk/core';

export const Combatant = createComponent(
  'Combatant',
  {
    team: { type: Types.Int32, default: 0 },
  },
  'A duelist combatant (player or opponent).',
);
