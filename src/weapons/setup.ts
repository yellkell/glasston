/**
 * Spawn-slot setup and the weapon-entity factory.
 *
 * The pedestals are invisible — each slot is just an empty spawn point that a
 * weapon floats at. They start empty so `WeaponSpawnSystem` fills them when a
 * match begins.
 */

import { Object3D, type Entity, type World } from '@iwsdk/core';
import { Pedestal } from '../components/Pedestal.js';
import { Weapon } from '../components/Weapon.js';
import { Grabbable } from '../components/Grabbable.js';
import { PEDESTAL_SLOTS, WEAPON } from '../config.js';
import {
  attachAmmoBadge,
  buildWeaponMesh,
  getArchetype,
  makeAmmoBadge,
  type Archetype,
} from './archetypes.js';

export function setupPedestals(world: World): void {
  PEDESTAL_SLOTS.forEach((slot, index) => {
    // Invisible spawn point: no mesh, just the slot position + state.
    const entity = world.createTransformEntity(new Object3D(), { persistent: true });
    entity.object3D!.position.set(slot.position[0], slot.position[1], slot.position[2]);
    entity.addComponent(Pedestal, { slot: index, occupied: false, emptyOrder: 0 });
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
