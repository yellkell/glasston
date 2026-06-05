/**
 * Shared feedback bus. CollisionSystem raises a pulse + the world-space
 * direction the shot came from when the player is hit; PlayerFeedbackSystem
 * consumes it to draw a subtle, directional damage indicator.
 */

export const feedback = {
  /** 0..1 — set to 1 on a player hit, decays each frame. */
  playerHitFlash: 0,
  /** World-space unit direction from the player toward the shot's origin. */
  srcX: 0,
  srcY: 0,
  srcZ: -1,
};
