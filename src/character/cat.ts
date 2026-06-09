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
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  SphereGeometry,
  TorusGeometry,
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

  // Bigger, rounder head for more kawaii proportions (patterned).
  const headR = r * 1.05;
  const headY = r * 1.2;
  const head = new Mesh(new SphereGeometry(headR, 32, 24), furMat());
  head.name = 'head';
  head.position.set(0, headY, 0);
  head.scale.set(1.08, 1.02, 1.0);
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

  // Much bigger, more expressive eyes with larger sparkles for kawaii appeal.
  const dark = makeGlass({ color: 0x2a2336, roughness: 0.05, emissiveIntensity: 0 });
  const shine = () => new MeshBasicMaterial({ color: 0xffffff });
  const eyeZ = headR * 0.88;
  for (const side of [-1, 1]) {
    // Larger eyes (0.26 → 0.34)
    const eye = new Mesh(new SphereGeometry(headR * 0.34, 20, 18), dark);
    eye.name = side < 0 ? 'left-eye' : 'right-eye';
    eye.scale.set(0.9, 1.15, 0.75);
    eye.position.set(side * headR * 0.38, headY + headR * 0.08, eyeZ);
    group.add(eye);
    // Larger, more prominent sparkle (0.07 → 0.10)
    const spark = new Mesh(new SphereGeometry(headR * 0.10, 12, 10), shine());
    spark.name = side < 0 ? 'left-sparkle' : 'right-sparkle';
    spark.position.set(side * headR * 0.44, headY + headR * 0.20, eyeZ + headR * 0.14);
    group.add(spark);
  }

  // Rosy blush under each eye (Bongo Cat cheeks).
  const blushMat = new MeshBasicMaterial({ color: 0xff8fcf, transparent: true, opacity: 0.55 });
  for (const side of [-1, 1]) {
    const blush = new Mesh(new SphereGeometry(headR * 0.14, 14, 12), blushMat);
    blush.name = side < 0 ? 'left-blush' : 'right-blush';
    blush.scale.set(1.2, 0.65, 0.4);
    blush.position.set(side * headR * 0.6, headY - headR * 0.18, headR * 0.82);
    group.add(blush);
  }

  // Slightly larger, cuter nose.
  const nose = new Mesh(new SphereGeometry(headR * 0.10, 14, 12), accent());
  nose.position.set(0, headY - headR * 0.14, headR * 0.98);
  group.add(nose);

  // ":3" mouth — two tiny smile arcs under the nose instead of the old dark blob.
  const mouth = new Group();
  mouth.name = 'mouth';
  for (const side of [-1, 1]) {
    const arc = new Mesh(
      new TorusGeometry(headR * 0.11, headR * 0.025, 8, 16, Math.PI * 0.9),
      dark,
    );
    // Torus arc starts at +X going CCW; PI*1.05 start leaves the opening upward.
    arc.rotation.z = Math.PI * 1.05;
    arc.position.set(side * headR * 0.105, headY - headR * 0.3, headR * 0.94);
    mouth.add(arc);
  }
  group.add(mouth);

  // Whiskers — three thin strands per cheek.
  const whiskerMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const w = new Mesh(new CylinderGeometry(headR * 0.008, 0.002, headR * 0.72, 5), whiskerMat);
      w.rotation.z = side * (Math.PI / 2 + 0.12 * i + 0.08);
      w.position.set(side * headR * 0.82, headY - headR * 0.16 + i * headR * 0.09, headR * 0.62);
      group.add(w);
    }
  }

  // Curled tail behind the body: a chain of shrinking spheres with an accent tip.
  const tail = new Group();
  tail.name = 'tail';
  const tailSegs = 6;
  for (let i = 0; i < tailSegs; i++) {
    const t = i / (tailSegs - 1);
    const segR = r * (0.16 - 0.06 * t);
    const seg = new Mesh(new SphereGeometry(segR, 12, 10), i === tailSegs - 1 ? accent() : furPlain());
    // Sweep up and curl over, behind the body (-Z).
    const ang = t * Math.PI * 0.9;
    seg.position.set(0, -r * 0.5 + Math.sin(ang) * r * 0.85, -r * 0.72 - Math.cos(ang) * r * 0.3 + t * r * 0.12);
    tail.add(seg);
  }
  group.add(tail);

  return group;
}

/**
 * Build a preview cat for the customization menu with animated Bongo Cat-style
 * paws that can track controller positions.
 */
export function buildPreviewCat(skin: Skin): Group {
  const cat = buildCat(skin);

  // Add Bongo Cat-style paws for the preview (positioned lower and in front)
  const leftPaw = buildCatPaw(skin);
  leftPaw.name = 'left-paw';
  leftPaw.position.set(-0.15, -0.15, 0.35); // Lower Y position
  leftPaw.scale.setScalar(1.0);
  cat.add(leftPaw);

  const rightPaw = buildCatPaw(skin);
  rightPaw.name = 'right-paw';
  rightPaw.position.set(0.15, -0.15, 0.35); // Lower Y position
  rightPaw.scale.setScalar(1.0);
  cat.add(rightPaw);

  return cat;
}
