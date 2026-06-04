/**
 * Weapon archetypes (data-driven) plus the glass weapon mesh + floating ammo
 * badge builders. v1 ships three firing archetypes; a deployable shield is
 * noted in PLAN.md as a deferred fourth.
 */

import {
  CanvasTexture,
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  type Object3D,
} from '@iwsdk/core';
import { makeGlass } from '../materials/glass.js';
import { glowSprite } from '../materials/glow.js';
import { PALETTE } from '../config.js';

export const WeaponType = {
  Pistol: 0,
  Spread: 1,
  Heavy: 2,
} as const;

export interface Archetype {
  id: number;
  name: string;
  ammo: number;
  cooldown: number; // seconds between shots
  auto: boolean; // hold-to-fire vs. one shot per pull
  damage: number;
  speed: number; // projectile speed (m/s)
  radius: number; // projectile radius
  pellets: number; // shots per trigger pull
  spreadDeg: number; // cone half-angle for multi-pellet weapons
  color: number; // projectile colour
  tint: number; // weapon body tint
  barrelLen: number; // muzzle distance from grip (m)
}

export const ARCHETYPES: Archetype[] = [
  {
    id: WeaponType.Pistol,
    name: 'Popper',
    ammo: 8,
    cooldown: 0.28,
    auto: false,
    damage: 10,
    speed: 4.0,
    radius: 0.045,
    pellets: 1,
    spreadDeg: 0,
    color: PALETTE.blue,
    tint: PALETTE.blue,
    barrelLen: 0.16,
  },
  {
    id: WeaponType.Spread,
    name: 'Scatter',
    ammo: 5,
    cooldown: 0.6,
    auto: false,
    damage: 6,
    speed: 4.4,
    radius: 0.04,
    pellets: 5,
    spreadDeg: 7,
    color: PALETTE.pink,
    tint: PALETTE.pink,
    barrelLen: 0.14,
  },
  {
    id: WeaponType.Heavy,
    name: 'Lobber',
    ammo: 3,
    cooldown: 0.85,
    auto: false,
    damage: 30,
    speed: 3.0,
    radius: 0.09,
    pellets: 1,
    spreadDeg: 0,
    color: PALETTE.purple,
    tint: PALETTE.purple,
    barrelLen: 0.18,
  },
];

export function getArchetype(id: number): Archetype {
  return ARCHETYPES[id] ?? ARCHETYPES[0];
}

/**
 * Build the chunky toy blaster from the poster: a rounded pink body, a pistol
 * grip, and a stack of bright bands down the barrel (yellow → blue → white) with
 * an archetype-coloured sight so the three weapons still read apart. Modelled
 * around the origin = grip point, with the barrel pointing local -Z (so it
 * aligns with the controller's aim).
 */
export function buildWeaponMesh(arch: Archetype): Group {
  const group = new Group();
  group.name = `weapon:${arch.name}`;

  const toy = (color: number, roughness = 0.3) => makeGlass({ color, roughness, emissive: color, emissiveIntensity: 0.08 });

  // Rounded pink body.
  const body = new Mesh(new SphereGeometry(0.055, 20, 16), toy(PALETTE.pink));
  body.scale.set(1.15, 1.0, 1.7);
  body.position.set(0, 0.01, -0.05);
  group.add(body);

  // Pistol grip, angled back like the box-art toy.
  const grip = new Mesh(new CapsuleGeometry(0.022, 0.07, 6, 12), toy(PALETTE.pink));
  grip.position.set(0, -0.06, 0.03);
  grip.rotation.x = 0.32;
  group.add(grip);

  // Barrel bands (cylinder axis rotated to lie along -Z).
  const band = (color: number, radius: number, length: number, z: number): void => {
    const m = new Mesh(new CylinderGeometry(radius, radius, length, 18), toy(color, 0.25));
    m.rotation.x = Math.PI / 2;
    m.position.set(0, 0.012, z);
    group.add(m);
  };
  band(PALETTE.yellow, 0.05, 0.045, -0.085);
  band(PALETTE.blue, 0.053, 0.05, -0.125);
  band(PALETTE.white, 0.05, 0.03, -0.155);

  // Dark muzzle mouth at the tip.
  const muzzle = new Mesh(new CylinderGeometry(0.032, 0.032, 0.012, 16), makeGlass({ color: 0x2a2336, roughness: 0.2, emissiveIntensity: 0 }));
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.012, -0.171);
  group.add(muzzle);

  // Archetype-coloured sight bump on top, so Popper/Scatter/Lobber differ.
  const sight = new Mesh(new SphereGeometry(0.018, 12, 10), toy(arch.color, 0.2));
  sight.position.set(0, 0.06, -0.03);
  group.add(sight);

  // Soft muzzle glow at the tip, tinted to the shot colour.
  const muzzleGlow = glowSprite(arch.color, 0.12, 0.8);
  muzzleGlow.position.set(0, 0.012, -arch.barrelLen - 0.01);
  group.add(muzzleGlow);

  return group;
}

/** Controller for a weapon's floating ammo number (canvas texture on a sprite). */
export interface AmmoBadge {
  sprite: Sprite;
  set(n: number): void;
}

export function makeAmmoBadge(initial: number, color: number): AmmoBadge {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const hex = `#${color.toString(16).padStart(6, '0')}`;
  const texture = new CanvasTexture(canvas);

  const draw = (n: number): void => {
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = 'bold 88px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hex;
    ctx.shadowColor = hex;
    ctx.shadowBlur = 18;
    ctx.fillText(String(n), 64, 70);
    texture.needsUpdate = true;
  };

  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(0.07);
  sprite.position.set(0, 0.11, 0.02);
  draw(initial);

  return { sprite, set: draw };
}

/** Stash/fetch the ammo badge on a weapon's object3D so systems can update it. */
export function attachAmmoBadge(obj: Object3D, badge: AmmoBadge): void {
  obj.add(badge.sprite);
  (obj.userData as { ammoBadge?: AmmoBadge }).ammoBadge = badge;
}

export function getAmmoBadge(obj: Object3D): AmmoBadge | undefined {
  return (obj.userData as { ammoBadge?: AmmoBadge }).ammoBadge;
}
