/**
 * Pedestal setup and the weapon-entity factory.
 *
 * Pedestals are created once as entities (visual hex plinth + `Pedestal`
 * component) at each fixed slot around the rim. They start empty so
 * `WeaponSpawnSystem` fills them on the first frame.
 */

import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Color,
  type Entity,
  type World,
} from '@iwsdk/core';
import { Pedestal } from '../components/Pedestal.js';
import { Weapon } from '../components/Weapon.js';
import { Grabbable } from '../components/Grabbable.js';
import { PALETTE, PEDESTAL_SLOTS, WEAPON } from '../config.js';
import { makeGlass, neonEdges } from '../materials/glass.js';
import { glowSprite } from '../materials/glow.js';
import { registerPulse } from '../materials/pulse.js';
import {
  attachAmmoBadge,
  buildWeaponMesh,
  getArchetype,
  makeAmmoBadge,
  type Archetype,
} from './archetypes.js';

/** A glowing hexagonal weapon pedestal mesh. */
function makePedestalMesh(): Group {
  const group = new Group();

  const plinthGeo = new CylinderGeometry(0.09, 0.12, 0.85, 6);
  const plinth = new Mesh(plinthGeo, makeGlass({ color: PALETTE.glassTint, roughness: 0.15 }));
  plinth.position.y = -0.425;
  group.add(plinth);

  const topGeo = new CylinderGeometry(0.13, 0.13, 0.04, 6);
  const topMat = new MeshStandardMaterial({
    color: new Color(PALETTE.pedestal),
    emissive: new Color(PALETTE.pedestal),
    emissiveIntensity: 2.2,
  });
  registerPulse(topMat, { amp: 0.6, speed: 2.2 });
  const top = new Mesh(topGeo, topMat);
  top.add(neonEdges(topGeo, 0xffd9a0));
  group.add(top);

  const glow = glowSprite(PALETTE.pedestal, 0.42, 0.65);
  glow.position.y = 0.02;
  group.add(glow);

  return group;
}

export function setupPedestals(world: World): void {
  PEDESTAL_SLOTS.forEach((slot, index) => {
    const mesh = makePedestalMesh();
    const entity = world.createTransformEntity(mesh, { persistent: true });
    entity.object3D!.position.set(slot.position[0], slot.position[1], slot.position[2]);
    entity.addComponent(Pedestal, { slot: index, occupied: false, respawnTimer: 0 });
  });
}

/** Resting transform for a weapon parked on a pedestal slot. */
export function slotParkPosition(slotIndex: number): [number, number, number] {
  const p = PEDESTAL_SLOTS[slotIndex].position;
  return [p[0], p[1] + WEAPON.parkLift, p[2]];
}

/** Create a weapon entity parked on the given pedestal slot. */
export function spawnWeapon(world: World, arch: Archetype, slotIndex: number): Entity {
  const mesh = buildWeaponMesh(arch);
  const entity = world.createTransformEntity(mesh);
  const [x, y, z] = slotParkPosition(slotIndex);
  entity.object3D!.position.set(x, y, z);

  entity.addComponent(Weapon, {
    type: arch.id,
    ammo: arch.ammo,
    maxAmmo: arch.ammo,
    cooldown: arch.cooldown,
    cooldownRemaining: 0,
    homeSlot: slotIndex,
  });
  entity.addComponent(Grabbable, {});

  attachAmmoBadge(entity.object3D!, makeAmmoBadge(arch.ammo, getArchetype(arch.id).color));
  return entity;
}
