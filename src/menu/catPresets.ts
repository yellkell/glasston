/**
 * Pre-built cat character presets inspired by Bongo Cat and popular internet cats.
 * Each preset has a name, description, and complete appearance configuration.
 */

import type { Skin, Pattern } from './skin.js';

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
    skin: {
      fur: 0,           // White
      accent: 0,        // Pink
      pattern: 'solid' as Pattern,
    },
  },
  {
    id: 'tuxedo',
    name: 'Tuxedo',
    description: 'Formal and fancy',
    skin: {
      fur: 7,           // Dark gray/black
      accent: 0,        // Pink
      pattern: 'tuxedo' as Pattern,
    },
  },
  {
    id: 'orange',
    name: 'Orange Tabby',
    description: 'Classic ginger cat',
    skin: {
      fur: 2,           // Orange
      accent: 7,        // Yellow
      pattern: 'stripes' as Pattern,
    },
  },
  {
    id: 'calico',
    name: 'Calico',
    description: 'Colorful and unique',
    skin: {
      fur: 0,           // White
      accent: 8,        // Orange
      pattern: 'spots' as Pattern,
    },
  },
  {
    id: 'siamese',
    name: 'Siamese',
    description: 'Elegant and vocal',
    skin: {
      fur: 1,           // Cream
      accent: 3,        // Purple
      pattern: 'solid' as Pattern,
    },
  },
  {
    id: 'gray',
    name: 'Russian Blue',
    description: 'Sleek and mysterious',
    skin: {
      fur: 5,           // Gray-blue
      accent: 4,        // Blue
      pattern: 'solid' as Pattern,
    },
  },
  {
    id: 'tabby',
    name: 'Brown Tabby',
    description: 'Classic striped pattern',
    skin: {
      fur: 3,           // Brown
      accent: 7,        // Yellow
      pattern: 'stripes' as Pattern,
    },
  },
  {
    id: 'tuxedo-white',
    name: 'White Tuxedo',
    description: 'Reverse tuxedo style',
    skin: {
      fur: 0,           // White
      accent: 6,        // Green
      pattern: 'tuxedo' as Pattern,
    },
  },
];

/**
 * Get a preset by ID.
 */
export function getPreset(id: string): CatPreset | undefined {
  return CAT_PRESETS.find(p => p.id === id);
}

/**
 * Get the default preset (Bongo Cat).
 */
export function getDefaultPreset(): CatPreset {
  return CAT_PRESETS[0];
}

// Made with Bob
