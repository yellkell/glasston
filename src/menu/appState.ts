/**
 * Top-level app state — the lobby/menu vs. an active match.
 *
 *  - 'menu'     : standing on your platform at the floating menu, choosing.
 *  - 'queueing' : you pressed Play with bots OFF; "searching for an opponent"
 *                 (real multiplayer isn't wired yet, so you wait in the lobby).
 *  - 'playing'  : a match is live (vs bots for now).
 *
 * `vsBots` is the menu toggle: ON warms you up against bots while you queue;
 * for now that just means a bot match starts immediately on Play.
 *
 * MenuSystem owns the transitions; GameStateSystem / AISystem / spawn + grab
 * systems read `state` to know when play is live.
 */

export type AppState = 'menu' | 'queueing' | 'playing';

export const app: { state: AppState; vsBots: boolean } = {
  state: 'menu',
  vsBots: true,
};
