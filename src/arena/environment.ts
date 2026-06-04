/**
 * The look foundation for passthrough Blasto.
 *
 * In an immersive-AR session the player's real room IS the backdrop, so we do
 * NOT draw a sky dome, a big floor, or volumetric light shafts — those would
 * paint over the passthrough feed. Instead we keep things light and friendly:
 * neutral tone mapping plus a soft pastel image-based light so the toy-like
 * surfaces (cat, blasters, balls) pick up gentle blue-above / pink-below tints.
 *
 * The scene background is left transparent so passthrough shows through; if the
 * device can't do AR, IWSDK falls back to a VR session and we paint the soft
 * lavender fallback colour from the palette.
 */

import {
  Color,
  IBLGradient,
  type World,
} from '@iwsdk/core';
import { PALETTE } from '../config.js';

/** hex → [r,g,b,a] in 0..1 for Types.Color component fields. */
function rgba(hex: number, a = 1): [number, number, number, number] {
  const c = new Color(hex);
  return [c.r, c.g, c.b, a];
}

export function setupEnvironment(world: World): void {
  // Neutral, slightly bright tone mapping keeps the pastels clean and friendly
  // rather than crushing them the way a filmic curve would.
  world.renderer.toneMappingExposure = 1.0;

  // Transparent backdrop so the AR passthrough feed shows through. The fallback
  // colour is only seen if the page renders outside an AR session.
  world.scene.background = null;
  world.renderer.setClearColor(new Color(PALETTE.background), 0);

  // Soft pastel IBL: cool blue sky, warm pink ground, airy white horizon. This
  // is lighting only — it never draws a visible dome — so passthrough is intact.
  const env = world.createTransformEntity(undefined, { persistent: true });
  env.addComponent(IBLGradient, {
    sky: rgba(0xbfe4ff),
    equator: rgba(0xffffff),
    ground: rgba(0xffd6ec),
    intensity: 1.1,
  });
}
