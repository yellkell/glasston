/**
 * Player loadout: which weapon type sits in each of the six spots, and which
 * weapon types are "curve" weapons (their ball follows the arc of the swing it
 * was fired with). Persisted to localStorage. Edited in the Loadout sub-menu.
 */

import { ARCHETYPES } from '../weapons/archetypes.js';

export interface Loadout {
  /** Weapon archetype id for each of the 6 spots (see PEDESTAL_SLOTS order). */
  slots: number[];
  /** Per weapon type: is it a curve weapon? Indexed by archetype id. */
  curve: boolean[];
}

const KEY = 'blasto.loadout.v1';

function load(): Loadout {
  const def: Loadout = { slots: [3, 0, 1, 1, 2, 2], curve: new Array(ARCHETYPES.length).fill(false) };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const s = JSON.parse(raw) as Partial<Loadout>;
      if (Array.isArray(s.slots) && s.slots.length === 6) def.slots = s.slots.map((n) => Number(n) || 0);
      if (Array.isArray(s.curve)) {
        for (let i = 0; i < def.curve.length; i++) def.curve[i] = !!s.curve[i];
      }
    }
  } catch {
    /* ignore */
  }
  return def;
}

export const loadout: Loadout = load();

export function saveLoadout(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(loadout));
  } catch {
    /* ignore */
  }
}
