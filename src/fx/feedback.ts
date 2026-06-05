/**
 * Tiny shared feedback bus. CollisionSystem raises a pulse when the player is
 * hit; PlayerFeedbackSystem consumes it to flash the screen vignette. Decoupled
 * so the collision pass doesn't need to own a camera-attached mesh.
 */

export const feedback = {
  /** 0..1 — set to 1 on a player hit, decays each frame. */
  playerHitFlash: 0,
};
