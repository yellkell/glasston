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
  0xfafdff, 0xffe6c8, 0xffd1a8, 0xe8c49a, 0xc9d3e0, 0x9aa3b5, 0x6b6f7d, 0x3c3f4a,
  0xc7f0d8, 0xbfe4ff, 0x9bb8ff, 0xd9c2ff, 0xffc6e6, 0xffb0b0, 0xb8e6c0, 0xffe98c,
];
export const ACCENT_COLORS = [
  0xff8fcf, 0xff5fa8, 0xb98cff, 0x8a5cff, 0x47b8ff, 0x2ee6c0, 0x6ee0a0, 0xffd23f, 0xffa14a, 0xff7a7a,
];
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
