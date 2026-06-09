/**
 * Weapon archetypes (data-driven) plus the glass weapon mesh + floating ammo
 * badge builders. v1 ships three firing archetypes; a deployable shield is
 * noted in PLAN.md as a deferred fourth.
 */

import {
  BoxGeometry,
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
  Sniper: 3,
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
  respawn: number; // seconds for this weapon to respawn (weak = fast, strong = slow)
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
    respawn: 2.0, // weakest → fastest
  },
  {
    id: WeaponType.Spread,
    name: 'Shotty',
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
    respawn: 3.5,
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
    respawn: 5.0, // strongest → slowest
  },
  {
    id: WeaponType.Sniper,
    name: 'Snipey',
    ammo: 3,
    cooldown: 0.16,
    auto: true,
    damage: 30,
    speed: 7.0, // small + fast
    radius: 0.028,
    pellets: 1,
    spreadDeg: 0,
    color: PALETTE.teal,
    tint: PALETTE.teal,
    barrelLen: 0.28, // long barrel
    respawn: 2.5,
  },
];

export function getArchetype(id: number): Archetype {
  return ARCHETYPES[id] ?? ARCHETYPES[0];
}

/**
 * Build a weapon mesh. Each archetype has a distinct silhouette so you can tell
 * them apart at a glance: a chunky toy Popper, a wide multi-barrel Scatter, a
 * fat Lobber, and a slim long-barrelled Sniper with a scope. Modelled around the
 * origin = grip point, barrel pointing local -Z (aligns with the controller).
 */
export function buildWeaponMesh(arch: Archetype): Group {
  const group = new Group();
  group.name = `weapon:${arch.name}`;

  const toy = (color: number, roughness = 0.3) => makeGlass({ color, roughness, emissive: color, emissiveIntensity: 0.08 });
  const dark = () => makeGlass({ color: 0x2a2336, roughness: 0.2, emissiveIntensity: 0 });
  const cyl = (color: number, rad: number, len: number, y: number, z: number, rough = 0.25): void => {
    const m = new Mesh(new CylinderGeometry(rad, rad, len, 16), color < 0 ? dark() : toy(color, rough));
    m.rotation.x = Math.PI / 2;
    m.position.set(0, y, z);
    group.add(m);
  };

  // Shared pistol grip.
  const grip = new Mesh(new CapsuleGeometry(0.022, 0.07, 6, 12), toy(PALETTE.pink));
  grip.position.set(0, -0.06, 0.03);
  grip.rotation.x = 0.32;
  group.add(grip);

  if (arch.id === WeaponType.Spread) {
    // Shotty — wide flat body with three stubby barrels.
    const body = new Mesh(new BoxGeometry(0.15, 0.055, 0.1), toy(PALETTE.pink));
    body.position.set(0, 0.012, -0.04);
    group.add(body);
    for (const dx of [-0.05, 0, 0.05]) {
      const b = new Mesh(new CylinderGeometry(0.017, 0.017, 0.08, 12), toy(PALETTE.blue, 0.25));
      b.rotation.x = Math.PI / 2;
      b.position.set(dx, 0.012, -0.11);
      group.add(b);
    }
  } else if (arch.id === WeaponType.Heavy) {
    // Lobber — fat bulky body and a wide stubby muzzle.
    const body = new Mesh(new SphereGeometry(0.07, 18, 14), toy(PALETTE.purple));
    body.scale.set(1.2, 1.15, 1.5);
    body.position.set(0, 0.012, -0.04);
    group.add(body);
    cyl(PALETTE.purple, 0.055, 0.07, 0.012, -0.13);
    cyl(PALETTE.yellow, 0.07, 0.02, 0.012, -0.165);
    cyl(-1, 0.05, 0.012, 0.012, -0.178);
  } else if (arch.id === WeaponType.Sniper) {
    // Snipey — slim body, long thin barrel, and a scope on top.
    const body = new Mesh(new BoxGeometry(0.045, 0.05, 0.16), toy(PALETTE.teal));
    body.position.set(0, 0.014, -0.05);
    group.add(body);
    cyl(0xdfe9ee, 0.015, 0.26, 0.02, -0.18, 0.2); // long barrel
    cyl(-1, 0.02, 0.018, 0.02, -0.30); // muzzle tip
    const mount = new Mesh(new BoxGeometry(0.012, 0.022, 0.05), toy(PALETTE.teal));
    mount.position.set(0, 0.05, -0.06);
    group.add(mount);
    cyl(-1, 0.016, 0.09, 0.068, -0.06); // scope tube
    cyl(PALETTE.blue, 0.016, 0.005, 0.068, -0.107, 0.1); // lens
  } else {
    // Popper — chunky toy with bright bands + a sight bump.
    const body = new Mesh(new SphereGeometry(0.055, 20, 16), toy(PALETTE.pink));
    body.scale.set(1.15, 1.0, 1.7);
    body.position.set(0, 0.01, -0.05);
    group.add(body);
    cyl(PALETTE.yellow, 0.05, 0.045, 0.012, -0.085);
    cyl(PALETTE.blue, 0.053, 0.05, 0.012, -0.125);
    cyl(PALETTE.white, 0.05, 0.03, 0.012, -0.155);
    cyl(-1, 0.032, 0.012, 0.012, -0.171);
    const sight = new Mesh(new SphereGeometry(0.018, 12, 10), toy(arch.color, 0.2));
    sight.position.set(0, 0.06, -0.03);
    group.add(sight);
  }

  // Soft muzzle glow at the tip.
  const muzzleGlow = glowSprite(arch.color, 0.1, 0.7);
  muzzleGlow.position.set(0, 0.014, -arch.barrelLen - 0.01);
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
