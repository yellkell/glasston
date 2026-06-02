/**
 * Glasston tunables. Numbers that the gameplay feel depends on live here so they
 * are easy to find and adjust. Dimensions are in metres, matching the reference
 * "Play Space Dimensions" diagram.
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
export const ARENA_GAP = 5.2;

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
}

const RAIL_Y = 0.95; // pedestal-top height (a comfortable reach near the rail)

export const PEDESTAL_SLOTS: PedestalSlot[] = [
  { id: 'front-left', position: [-OCTAGON_HALF_WIDTH + 0.12, RAIL_Y, -CHAMFER - 0.1] },
  { id: 'front-right', position: [OCTAGON_HALF_WIDTH - 0.12, RAIL_Y, -CHAMFER - 0.1] },
  { id: 'mid-left', position: [-OCTAGON_HALF_WIDTH + 0.05, RAIL_Y, 0] },
  { id: 'mid-right', position: [OCTAGON_HALF_WIDTH - 0.05, RAIL_Y, 0] },
];

/** Neon accent palette for the glassmorphic-cyberpunk look. */
export const PALETTE = {
  background: 0x05060f,
  magenta: 0xff2eb0,
  cyan: 0x2ee6ff,
  violet: 0x8a5cff,
  glassTint: 0x9ad8ff,
  pedestal: 0xff6a00,
};
