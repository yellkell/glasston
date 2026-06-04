/**
 * Weapon archetypes (data-driven) plus the glass weapon mesh + floating ammo
 * badge builders. v1 ships three firing archetypes; a deployable shield is
 * noted in PLAN.md as a deferred fourth.
 */

import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  type Object3D,
} from '@iwsdk/core';
import { makeGlass, neonEdges } from '../materials/glass.js';
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
 * Build a stylised glass gun. Modelled around the origin = grip point, with the
 * barrel pointing down local -Z (so it aligns with a controller's forward).
 */
export function buildWeaponMesh(arch: Archetype): Group {
  const group = new Group();
  group.name = `weapon:${arch.name}`;

  // Body (frosted glass shell).
  const bodyGeo = new BoxGeometry(0.05, 0.07, 0.12);
  const body = new Mesh(bodyGeo, makeGlass({ color: arch.tint, roughness: 0.15, thickness: 0.3 }));
  body.position.set(0, 0.01, -0.02);
  body.add(neonEdges(bodyGeo, arch.tint));
  group.add(body);

  // Barrel (emissive core that glows through the glass).
  const barrelGeo = new CylinderGeometry(0.018, 0.022, arch.barrelLen, 12);
  const barrel = new Mesh(
    barrelGeo,
    new MeshStandardMaterial({ color: arch.color, emissive: arch.color, emissiveIntensity: 2 }),
  );
  barrel.rotation.x = Math.PI / 2; // align cylinder axis to -Z
  barrel.position.set(0, 0.02, -0.04 - arch.barrelLen / 2);
  group.add(barrel);

  // Muzzle glow at the barrel tip.
  const muzzleGlow = glowSprite(arch.color, 0.12, 0.8);
  muzzleGlow.position.set(0, 0.02, -0.04 - arch.barrelLen);
  group.add(muzzleGlow);

  // Grip stub.
  const gripGeo = new BoxGeometry(0.035, 0.09, 0.045);
  const grip = new Mesh(gripGeo, makeGlass({ color: arch.tint, roughness: 0.2 }));
  grip.position.set(0, -0.05, 0.02);
  group.add(grip);

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
