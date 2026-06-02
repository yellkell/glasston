/** Marks an entity that a controller can grab (currently: parked weapons). */

import { createComponent } from '@iwsdk/core';

export const Grabbable = createComponent('Grabbable', {}, 'Can be grabbed by a controller.');
