/**
 * Player avatar skin: fur colour, accent colour (ears/nose/cheeks) and a fur
 * pattern. Persisted to localStorage so your look sticks between sessions. The
 * opponent bot uses its own default skin so the duel always reads clearly.
 *
 * This is the data the customizer edits and the cat builder (character/cat.ts)
 * renders; it's also the hook for showing each player's chosen look in
 * multiplayer later.
 */

export type Pattern = 'solid' | 'spots' | 'stripes' | 'tuxedo';

export interface Skin {
  fur: number;
  accent: number;
  pattern: Pattern;
}

export const FUR_COLORS = [
  0xfafdff, 0xffe6c8, 0xc9d3e0, 0xa9a4b8, 0xbfe4ff, 0xffc6e6, 0xd9c2ff, 0xc7f0d8,
];
export const ACCENT_COLORS = [0xff8fcf, 0xb98cff, 0x47b8ff, 0xffd23f, 0x6ee0a0, 0xff7a7a];
export const PATTERNS: Pattern[] = ['solid', 'spots', 'stripes', 'tuxedo'];

const KEY = 'blasto.skin.v1';

function load(): Skin {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const s = JSON.parse(raw) as Partial<Skin>;
      if (typeof s.fur === 'number' && typeof s.accent === 'number' && s.pattern) {
        return { fur: s.fur, accent: s.accent, pattern: s.pattern };
      }
    }
  } catch {
    /* ignore */
  }
  return { fur: 0xfafdff, accent: 0xff8fcf, pattern: 'solid' };
}

/** The local player's chosen skin (mutated by the customizer). */
export const playerSkin: Skin = load();

export function saveSkin(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(playerSkin));
  } catch {
    /* ignore */
  }
}

/** The bot opponent's fixed look (classic white + pink). */
export const opponentSkin: Skin = { fur: 0xfafdff, accent: 0xff8fcf, pattern: 'solid' };
