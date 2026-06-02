/** Present while a weapon is held; `hand` is 0 = left, 1 = right. */

import { createComponent, Types } from '@iwsdk/core';

export const HeldBy = createComponent(
  'HeldBy',
  {
    hand: { type: Types.Int32, default: 1 },
  },
  'A weapon currently held in a hand.',
);
