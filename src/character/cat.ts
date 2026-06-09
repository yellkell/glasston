/**
 * The kawaii cat avatar, built from a Skin (fur colour, accent colour, pattern).
 * Shared by the bot opponent (combat/setup) and the customizer preview so they
 * always look identical. The fur pattern is a procedurally drawn canvas texture
 * mapped onto the body + head; accent parts (ear linings, nose, cheeks, tongue)
 * take the accent colour.
 */

import {
  CanvasTexture,
  Color,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  SphereGeometry,
} from '@iwsdk/core';
import { COMBAT } from '../config.js';
import { makeGlass } from '../materials/glass.js';
import type { Skin } from '../menu/skin.js';
import { buildCatPaw } from './catPaw.js';

/** Darken a hex colour by factor f (0..1). */
function shade(hex: number, f: number): string {
  const c = new Color(hex);
  return `rgb(${Math.round(c.r * 255 * f)},${Math.round(c.g * 255 * f)},${Math.round(c.b * 255 * f)})`;
}

/** Procedural fur texture: base fur colour plus the chosen pattern. */
function furTexture(skin: Skin): CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${skin.fur.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, S, S);

  if (skin.pattern === 'spots') {
    ctx.fillStyle = shade(skin.fur, 0.72);
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 10 + Math.random() * 18;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skin.pattern === 'stripes') {
    ctx.strokeStyle = shade(skin.fur, 0.7);
    ctx.lineWidth = 16;
    for (let x = -S; x < S * 2; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + S, S);
      ctx.stroke();
    }
  } else if (skin.pattern === 'tuxedo') {
    // Cream belly/chest across the lower (front) band.
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.ellipse(S / 2, S * 0.82, S * 0.42, S * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return new CanvasTexture(canvas);
}

/**
 * Build a cat. The group origin sits at the chest (so it lines up with the
 * Hitbox), and the face is on +Z because Object3D.lookAt aims a mesh's +Z at
 * its target — once the AI turns to face you, the +Z side is what you see.
 */
export function buildCat(skin: Skin): Group {
  const group = new Group();
  group.name = 'cat';

  const furMat = (): MeshPhysicalMaterial =>
    new MeshPhysicalMaterial({
      color: new Color(0xffffff),
      map: furTexture(skin),
      roughness: 0.5,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });
  const furPlain = () => makeGlass({ color: skin.fur, roughness: 0.5, emissiveIntensity: 0.04 });
  const accent = () => makeGlass({ color: skin.accent, roughness: 0.4, emissive: skin.accent, emissiveIntensity: 0.3 });

  const r = COMBAT.dummyHitboxRadius;

  // Body — slimmer, slightly tall egg shape (patterned).
  const body = new Mesh(new SphereGeometry(r, 28, 22), furMat());
  body.name = 'body';
  body.scale.set(0.8, 1.18, 0.78);
  group.add(body);

  // Stubby paws nudged forward (+Z) - for the standing cat body.
  for (const side of [-1, 1]) {
    const paw = new Mesh(new SphereGeometry(r * 0.22, 14, 12), furPlain());
    paw.name = side < 0 ? 'left-foot' : 'right-foot';
    paw.position.set(side * r * 0.66, -r * 0.1, r * 0.35);
    group.add(paw);
  }

  // Big round head (patterned).
  const headR = r * 0.92;
  const headY = r * 1.15;
  const head = new Mesh(new SphereGeometry(headR, 28, 22), furMat());
  head.name = 'head';
  head.position.set(0, headY, 0);
  head.scale.set(1.05, 1, 0.98);
  group.add(head);

  // Ears — pink-lined triangles.
  for (const side of [-1, 1]) {
    const ear = new Mesh(new ConeGeometry(headR * 0.4, headR * 0.95, 18), furPlain());
    ear.name = side < 0 ? 'left-ear' : 'right-ear';
    ear.scale.set(1, 1, 0.45);
    ear.position.set(side * headR * 0.52, headY + headR * 0.86, headR * 0.05);
    ear.rotation.set(0.12, 0, side * -0.22);
    const inner = new Mesh(new ConeGeometry(headR * 0.22, headR * 0.62, 16), accent());
    inner.position.set(0, -headR * 0.04, headR * 0.06);
    ear.add(inner);
    group.add(ear);
  }

  // Eyes — big glossy dark ovals with a bright sparkle.
  const dark = makeGlass({ color: 0x2a2336, roughness: 0.08, emissiveIntensity: 0 });
  const shine = () => new MeshBasicMaterial({ color: 0xffffff });
  const eyeZ = headR * 0.9;
  for (const side of [-1, 1]) {
    const eye = new Mesh(new SphereGeometry(headR * 0.26, 18, 16), dark);
    eye.name = side < 0 ? 'left-eye' : 'right-eye';
    eye.scale.set(0.85, 1.1, 0.7);
    eye.position.set(side * headR * 0.36, headY + headR * 0.06, eyeZ);
    group.add(eye);
    const spark = new Mesh(new SphereGeometry(headR * 0.07, 10, 8), shine());
    spark.position.set(side * headR * 0.42, headY + headR * 0.16, eyeZ + headR * 0.12);
    group.add(spark);
  }

  // Nose + a small dark mouth (no tongue/cheeks).
  const nose = new Mesh(new SphereGeometry(headR * 0.09, 12, 10), accent());
  nose.position.set(0, headY - headR * 0.16, headR * 1.0);
  group.add(nose);
  const mouth = new Mesh(new SphereGeometry(headR * 0.09, 14, 12), dark);
  mouth.scale.set(1.1, 0.6, 0.5);
  mouth.position.set(0, headY - headR * 0.34, headR * 0.93);
  group.add(mouth);

  return group;
}

/**
 * Build a preview cat for the customization menu with animated Bongo Cat-style
 * paws that can track controller positions.
 */
export function buildPreviewCat(skin: Skin): Group {
  const cat = buildCat(skin);

  // Add Bongo Cat-style paws for the preview (positioned in front, ready to wave)
  const leftPaw = buildCatPaw(skin);
  leftPaw.name = 'left-paw';
  leftPaw.position.set(-0.15, 0.05, 0.4);
  leftPaw.scale.setScalar(1.2); // Slightly larger for visibility
  cat.add(leftPaw);

  const rightPaw = buildCatPaw(skin);
  rightPaw.name = 'right-paw';
  rightPaw.position.set(0.15, 0.05, 0.4);
  rightPaw.scale.setScalar(1.2);
  cat.add(rightPaw);

  return cat;
}
