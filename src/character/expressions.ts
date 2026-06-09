/**
 * Cat facial expressions system.
 * Provides different eye and mouth shapes for various emotions.
 */

import { Group, Mesh, MeshBasicMaterial, SphereGeometry } from '@iwsdk/core';

export type Expression = 'neutral' | 'happy' | 'surprised' | 'determined' | 'excited';

interface ExpressionConfig {
  eyeScaleY: number;
  eyeOffsetY: number;
  mouthScaleY: number;
  mouthOffsetY: number;
  sparkleScale: number;
}

const EXPRESSIONS: Record<Expression, ExpressionConfig> = {
  neutral: {
    eyeScaleY: 1.15,
    eyeOffsetY: 0.08,
    mouthScaleY: 0.65,
    mouthOffsetY: -0.32,
    sparkleScale: 1.0,
  },
  happy: {
    eyeScaleY: 0.6, // Squinted happy eyes
    eyeOffsetY: 0.12,
    mouthScaleY: 0.8, // Wider smile
    mouthOffsetY: -0.28,
    sparkleScale: 1.3,
  },
  surprised: {
    eyeScaleY: 1.4, // Wide open eyes
    eyeOffsetY: 0.10,
    mouthScaleY: 0.9, // Open mouth
    mouthOffsetY: -0.30,
    sparkleScale: 1.5,
  },
  determined: {
    eyeScaleY: 0.9, // Slightly narrowed
    eyeOffsetY: 0.06,
    mouthScaleY: 0.5, // Tight mouth
    mouthOffsetY: -0.34,
    sparkleScale: 0.8,
  },
  excited: {
    eyeScaleY: 1.3, // Big excited eyes
    eyeOffsetY: 0.14,
    mouthScaleY: 0.75,
    mouthOffsetY: -0.26,
    sparkleScale: 1.4,
  },
};

/**
 * Apply an expression to a cat by modifying its eye and mouth geometry.
 */
export function applyExpression(cat: Group, expression: Expression): void {
  const config = EXPRESSIONS[expression];
  const headR = 0.25; // Approximate head radius

  // Update eyes
  for (const side of ['left', 'right']) {
    const eye = cat.children.find(c => c.name === `${side}-eye`) as Mesh | undefined;
    if (eye) {
      eye.scale.y = config.eyeScaleY;
      eye.position.y = eye.position.y + (config.eyeOffsetY - 0.08) * headR;
    }
  }

  // Update sparkles
  for (const child of cat.children) {
    if (child instanceof Mesh && child.material instanceof MeshBasicMaterial) {
      // This is likely a sparkle
      child.scale.setScalar(config.sparkleScale);
    }
  }

  // Update mouth
  const mouth = cat.children.find(c => c instanceof Mesh && c.name !== 'body' && c.name !== 'head') as Mesh | undefined;
  if (mouth && mouth.geometry instanceof SphereGeometry) {
    mouth.scale.y = config.mouthScaleY;
  }
}

/**
 * Get a random expression for variety.
 */
export function getRandomExpression(): Expression {
  const expressions: Expression[] = ['neutral', 'happy', 'surprised', 'determined', 'excited'];
  return expressions[Math.floor(Math.random() * expressions.length)];
}

// Made with Bob
