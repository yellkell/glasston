/**
 * Cat facial expressions: eye squint/widen, sparkle size and mouth scale per
 * emotion. Works on the named parts buildCat creates (left/right-eye,
 * left/right-sparkle, mouth) and stores each part's authored transform in
 * userData on first use, so expressions are absolute — applying one never
 * accumulates drift on top of the last (the old version nudged eye positions
 * relative to wherever they already were, and "found" the mouth by grabbing
 * the first stray mesh, usually a foot).
 *
 * Used by OpponentAnimSystem to give the duelling cat readable moods:
 * determined while winding up a shot, surprised when hit, happy when it lands one.
 */

import { Group, Object3D } from '@iwsdk/core';

export type Expression = 'neutral' | 'happy' | 'surprised' | 'determined' | 'excited';

interface ExpressionConfig {
  /** Multiplier on the eyes' modelled scale.y (1 = as built). */
  eyeScale: number;
  /** Vertical eye offset in fractions of the eyes' modelled height. */
  eyeLift: number;
  /** Multiplier on the mouth group's scale (1 = as built). */
  mouthScale: number;
  /** Multiplier on the sparkles' modelled scale. */
  sparkleScale: number;
}

const EXPRESSIONS: Record<Expression, ExpressionConfig> = {
  neutral: { eyeScale: 1.0, eyeLift: 0, mouthScale: 1.0, sparkleScale: 1.0 },
  happy: { eyeScale: 0.45, eyeLift: 0.06, mouthScale: 1.35, sparkleScale: 1.3 }, // squinty smile
  surprised: { eyeScale: 1.3, eyeLift: 0.04, mouthScale: 1.15, sparkleScale: 1.5 },
  determined: { eyeScale: 0.75, eyeLift: -0.03, mouthScale: 0.8, sparkleScale: 0.8 },
  excited: { eyeScale: 1.2, eyeLift: 0.08, mouthScale: 1.25, sparkleScale: 1.4 },
};

/** Stash the authored transform the first time we touch a part. */
function remember(o: Object3D): void {
  if (typeof o.userData.baseScaleY !== 'number') {
    o.userData.baseScaleY = o.scale.y;
    o.userData.baseScaleX = o.scale.x;
    o.userData.baseScaleZ = o.scale.z;
    o.userData.basePosY = o.position.y;
  }
}

/** Apply an expression to a cat built by buildCat. Absolute, repeat-safe. */
export function applyExpression(cat: Group, expression: Expression): void {
  const config = EXPRESSIONS[expression];

  for (const side of ['left', 'right'] as const) {
    const eye = cat.getObjectByName(`${side}-eye`);
    if (eye) {
      remember(eye);
      const baseY = eye.userData.baseScaleY as number;
      eye.scale.y = baseY * config.eyeScale;
      eye.position.y = (eye.userData.basePosY as number) + baseY * config.eyeLift;
    }
    const sparkle = cat.getObjectByName(`${side}-sparkle`);
    if (sparkle) {
      remember(sparkle);
      sparkle.scale.setScalar((sparkle.userData.baseScaleX as number) * config.sparkleScale);
    }
  }

  const mouth = cat.getObjectByName('mouth');
  if (mouth) {
    remember(mouth);
    mouth.scale.set(
      (mouth.userData.baseScaleX as number) * config.mouthScale,
      (mouth.userData.baseScaleY as number) * config.mouthScale,
      (mouth.userData.baseScaleZ as number) * config.mouthScale,
    );
  }
}

/** Get a random expression for variety. */
export function getRandomExpression(): Expression {
  const expressions: Expression[] = ['neutral', 'happy', 'surprised', 'determined', 'excited'];
  return expressions[Math.floor(Math.random() * expressions.length)];
}
