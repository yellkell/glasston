/** Per-frame state for the AI opponent's aim / fire / dodge behaviour. */

import { createComponent, Types } from '@iwsdk/core';

export const AIController = createComponent(
  'AIController',
  {
    fireTimer: { type: Types.Float32, default: 1.6 },
    moveTimer: { type: Types.Float32, default: 1.0 },
    /** Lateral position the opponent is currently strafing toward (local x). */
    targetX: { type: Types.Float32, default: 0 },
  },
  'AI opponent behaviour state.',
);
