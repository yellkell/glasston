/**
 * Blasto tunables. Numbers that the gameplay feel depends on live here so they
 * are easy to find and adjust. Dimensions are in metres, matching the reference
 * "Play Space Dimensions" diagram.
 *
 * Blasto is a playful, passthrough-first WebXR game: cat-like duelists lob slow
 * ping-pong balls at each other and you dodge with your real body. The palette
 * is soft and friendly — white, blue, pink and purple.
 */

import type { Vector2Tuple } from 'three';

/**
 * The player's octagonal dodge box, derived from the Blaston play-space diagram:
 * overall ~1.72 m wide x 1.5 m deep, with a 0.75 m straight front/back edge and
 * ~0.6 m chamfered corners. Vertices are listed clockwise in the floor plane
 * (x = left/right, z = forward/back, with -z pointing toward the opponent).
 */
export const OCTAGON_HALF_WIDTH = 0.86; // 1.72 m / 2
export const OCTAGON_HALF_DEPTH = 0.75; // 1.5 m / 2
const EDGE_HALF = 0.375; // half of the 0.75 m straight edge
const CHAMFER = 0.375; // corner inset, giving ~0.6 m diagonal segments

/** Octagon outline (clockwise), centred on the player rig at the origin. */
export const OCTAGON_VERTICES: Vector2Tuple[] = [
  [-EDGE_HALF, -OCTAGON_HALF_DEPTH], // front-left
  [EDGE_HALF, -OCTAGON_HALF_DEPTH], // front-right
  [OCTAGON_HALF_WIDTH, -CHAMFER], // right-front chamfer
  [OCTAGON_HALF_WIDTH, CHAMFER], // right-back chamfer
  [EDGE_HALF, OCTAGON_HALF_DEPTH], // back-right
  [-EDGE_HALF, OCTAGON_HALF_DEPTH], // back-left
  [-OCTAGON_HALF_WIDTH, CHAMFER], // left-back chamfer
  [-OCTAGON_HALF_WIDTH, -CHAMFER], // left-front chamfer
];

/** Distance between the two platforms, centre to centre. Tunes shot travel time. */
export const ARENA_GAP = 3.8;

/**
 * Weapon pedestal slots, positioned around the rim of the platform. Per Blaston,
 * weapons spawn at fixed spots around you but NEVER directly in front or behind —
 * so these sit on the side / diagonal edges, forcing you to reach and turn.
 * Positions are local to the player rig (metres). `facing` is the yaw the pedestal
 * top is angled toward (radians, 0 = -z forward).
 */
export interface PedestalSlot {
  id: string;
  position: [number, number, number];
  /** Fixed weapon archetype id for this spot: 0 = Popper, 1 = Scatter, 2 = Lobber. */
  type: number;
}

const RAIL_Y = 0.95; // floating-weapon height (a comfortable reach)

/**
 * Six floating weapon spots around the player (pedestals are invisible). The
 * four side spots hold the lighter, faster-respawning weapons; the two BEHIND
 * spots hold the powerful Lobber, so you must turn your back to grab it.
 */
export const PEDESTAL_SLOTS: PedestalSlot[] = [
  { id: 'front-left', position: [-OCTAGON_HALF_WIDTH + 0.12, RAIL_Y, -CHAMFER - 0.1], type: 3 },
  { id: 'front-right', position: [OCTAGON_HALF_WIDTH - 0.12, RAIL_Y, -CHAMFER - 0.1], type: 0 },
  { id: 'mid-left', position: [-OCTAGON_HALF_WIDTH + 0.05, RAIL_Y, 0], type: 1 },
  { id: 'mid-right', position: [OCTAGON_HALF_WIDTH - 0.05, RAIL_Y, 0], type: 1 },
  { id: 'back-left', position: [-OCTAGON_HALF_WIDTH + 0.12, RAIL_Y, CHAMFER + 0.1], type: 2 },
  { id: 'back-right', position: [OCTAGON_HALF_WIDTH - 0.12, RAIL_Y, CHAMFER + 0.1], type: 2 },
];

/**
 * Projectile feel — the single most important tuning in the game. Blaston shots
 * are SLOW enough to read and dodge with your body. Speed is in metres/second.
 */
export const PROJECTILE = {
  speed: 4.0, // slow drift; raise for harder, lower for floatier
  lifetime: 4.0, // seconds before a missed shot despawns
  radius: 0.045, // glass-orb radius (also the collision radius later)
  muzzleOffset: 0.08, // spawn this far ahead of the controller so it clears the hand
  damage: 10, // damage a player shot deals on hit
};

/** Combat tuning: health pools and body-hitbox sizes (metres). */
export const COMBAT = {
  playerHealth: 100,
  dummyHealth: 100,
  dummyHitboxRadius: 0.32,
};

/**
 * Head-driven IK body. The player's hitbox is not a single sphere — it is a spine
 * solved each frame from the tracked head down to pinned hips, with three hitbox
 * spheres along it. Leaning/ducking the head swings the torso, so dodging is a
 * whole-body act. Radii in metres; `hipHeight` is the pinned pelvis height.
 */
export const BODY_IK = {
  hipHeight: 0.95,
  /** Fraction along hips→head where the chest sphere sits. */
  chestAlong: 0.55,
  headRadius: 0.13,
  chestRadius: 0.2,
  pelvisRadius: 0.17,
};

/**
 * Phase-3 scripted shooter: a placeholder opponent that lobs shots at the player
 * so dodging can be tested. It is replaced by the real AI in Phase 5.
 */
export const SCRIPTED_SHOOTER = {
  interval: 2.4, // seconds between shots
  speed: 3.5, // slightly slower than your own shots → easy to read & dodge
  damage: 8,
  aimJitter: 0.12, // random aim error (metres at the target) so it's dodge-able
};

/** Grabbing & weapon-pedestal behaviour. */
export const GRAB = {
  /** How close a controller's grip must be to a parked weapon to grab it (m). */
  radius: 0.24,
};

export const WEAPON = {
  /** Seconds after a weapon is spent before its pedestal spawns a fresh one. */
  respawnDelay: 1.5,
  /** How high above the pedestal hex top a parked weapon floats (m). */
  parkLift: 0.12,
};

/** A released weapon falls and despawns when it lands. */
export const DROP = {
  gravity: 9.8, // m/s²
  floorY: 0.04, // weapon centre height at which it "lands" and despawns
  spin: 3.0, // rad/s tumble while falling, for a little life
};

/**
 * Blocking: a weapon (whether held or mid-drop) deflects incoming enemy
 * ping-pong balls within this radius of it (metres).
 */
export const BLOCK = {
  radius: 0.16,
};

/** Curve weapons: how strongly the controller's swing bends the ball's path. */
export const CURVE = {
  strength: 3.5, // multiplier on the perpendicular swing velocity (m/s²)
  maxSwing: 2.2, // clamp the swing speed so flicks don't curve absurdly
};

/** AI opponent behaviour. */
export const AI = {
  bodyY: 1.4, // default chest height of the opponent body
  bodyYMin: 1.0, // minimum height when ducking
  bodyYMax: 1.5, // maximum height when standing tall
  padHalfWidth: 0.7, // how far the opponent strafes left/right on its pad
  moveSpeed: 1.6, // lateral m/s
  duckSpeed: 2.0, // vertical m/s (faster than lateral for quick ducks)
  fireInterval: 1.6, // seconds between shots
  projectileSpeed: 3.6,
  damage: 9,
  aimError: 0.18, // metres of random aim scatter at the player
  reactDistance: 1.6, // dodge when a player shot is within this range
};

/** Match / round flow. */
export const MATCH = {
  roundTime: 60, // seconds per round
  winTarget: 3, // first to this many round wins takes the match
  roundOverDelay: 3, // pause showing the round result
  matchOverDelay: 6, // pause showing the match result before a full reset
};

/**
 * The "Play BLASTO!" poster palette — cyan/teal, candy pink, purple and white,
 * with toy-bright yellow and blue accents lifted from the blaster on the box
 * art. `background` is only a fallback when passthrough is unavailable; in an
 * AR session the real room shows through instead.
 *  - teal   → the BLASTO brand colour (signage, your boundary)
 *  - blue   → player accent / toy-gun band
 *  - pink   → opponent accent (the cat foe) / toy-gun body
 *  - purple → shared furniture accent (pedestals, clouds, highlights)
 *  - yellow → toy-gun band pop
 *  - white  → ping-pong balls, the cat's fur, soft surfaces
 */
export const PALETTE = {
  background: 0xe9f8ff, // soft cyan-white fallback sky
  teal: 0x4fd8e6,
  blue: 0x47b8ff,
  pink: 0xff8fcf,
  purple: 0xb98cff,
  yellow: 0xffd23f,
  white: 0xfafdff,
};
