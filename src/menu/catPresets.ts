/**
 * Pre-built cat character presets inspired by Bongo Cat and popular internet cats.
 * Each preset stores a complete, ready-to-render Skin (real hex colours drawn
 * from the shared palettes in skin.ts — NOT palette indices), so applying a
 * preset is a straight copy into playerSkin.
 */

import { ACCENT_COLORS, FUR_COLORS, type Skin } from './skin.js';

export interface CatPreset {
  id: string;
  name: string;
  description: string;
  skin: Skin;
}

/**
 * Collection of pre-built cat character presets.
 * Users can select these instead of customizing individual colors.
 */
export const CAT_PRESETS: CatPreset[] = [
  {
    id: 'bongo',
    name: 'Bongo Cat',
    description: 'The original keyboard warrior',
    skin: { fur: FUR_COLORS[0], accent: ACCENT_COLORS[0], pattern: 'solid' }, // white + pink
  },
  {
    id: 'tuxedo',
    name: 'Tuxedo',
    description: 'Formal and fancy',
    skin: { fur: FUR_COLORS[7], accent: ACCENT_COLORS[0], pattern: 'tuxedo' }, // near-black + pink
  },
  {
    id: 'orange',
    name: 'Orange Tabby',
    description: 'Classic ginger cat',
    skin: { fur: FUR_COLORS[2], accent: ACCENT_COLORS[8], pattern: 'stripes' }, // orange + orange
  },
  {
    id: 'calico',
    name: 'Calico',
    description: 'Colorful and unique',
    skin: { fur: FUR_COLORS[0], accent: ACCENT_COLORS[8], pattern: 'spots' }, // white + orange
  },
  {
    id: 'siamese',
    name: 'Siamese',
    description: 'Elegant and vocal',
    skin: { fur: FUR_COLORS[1], accent: ACCENT_COLORS[3], pattern: 'solid' }, // cream + purple
  },
  {
    id: 'gray',
    name: 'Russian Blue',
    description: 'Sleek and mysterious',
    skin: { fur: FUR_COLORS[5], accent: ACCENT_COLORS[4], pattern: 'solid' }, // grey-blue + blue
  },
  {
    id: 'tabby',
    name: 'Brown Tabby',
    description: 'Classic striped pattern',
    skin: { fur: FUR_COLORS[3], accent: ACCENT_COLORS[7], pattern: 'stripes' }, // brown + yellow
  },
  {
    id: 'tuxedo-white',
    name: 'White Tuxedo',
    description: 'Reverse tuxedo style',
    skin: { fur: FUR_COLORS[0], accent: ACCENT_COLORS[5], pattern: 'tuxedo' }, // white + teal
  },
];

/** Get a preset by ID. */
export function getPreset(id: string): CatPreset | undefined {
  return CAT_PRESETS.find((p) => p.id === id);
}

/** Get the default preset (Bongo Cat). */
export function getDefaultPreset(): CatPreset {
  return CAT_PRESETS[0];
}

/** Find the preset matching a skin (so the panel highlights your current look). */
export function findPresetForSkin(skin: Skin): CatPreset | undefined {
  return CAT_PRESETS.find(
    (p) => p.skin.fur === skin.fur && p.skin.accent === skin.accent && p.skin.pattern === skin.pattern,
  );
}
