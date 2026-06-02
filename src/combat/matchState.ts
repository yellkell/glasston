/**
 * Shared, mutable match state. `GameStateSystem` owns the transitions; other
 * systems (e.g. AISystem) read `phase` to know when play is live.
 */

export type MatchPhase = 'playing' | 'roundOver' | 'matchOver';

export interface MatchState {
  phase: MatchPhase;
  round: number;
  playerScore: number;
  aiScore: number;
  roundTimer: number; // seconds left in the round
  resultTimer: number; // countdown shown during roundOver / matchOver
  message: string; // headline status for the HUD
}

export const match: MatchState = {
  phase: 'playing',
  round: 1,
  playerScore: 0,
  aiScore: 0,
  roundTimer: 0,
  resultTimer: 0,
  message: '',
};
