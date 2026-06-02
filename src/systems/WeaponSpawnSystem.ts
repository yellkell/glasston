/**
 * Keeps the pedestals stocked: any unoccupied pedestal counts down its respawn
 * timer and then materialises a fresh random weapon. On the first frame every
 * pedestal is empty, so this fills them all immediately.
 */

import { createSystem } from '@iwsdk/core';
import { Pedestal } from '../components/Pedestal.js';
import { ARCHETYPES } from '../weapons/archetypes.js';
import { spawnWeapon } from '../weapons/setup.js';

export class WeaponSpawnSystem extends createSystem({
  pedestals: { required: [Pedestal] },
}) {
  update(delta: number): void {
    for (const pedestal of this.queries.pedestals.entities) {
      if (pedestal.getValue(Pedestal, 'occupied')) continue;

      const timer = (pedestal.getValue(Pedestal, 'respawnTimer') ?? 0) - delta;
      if (timer > 0) {
        pedestal.setValue(Pedestal, 'respawnTimer', timer);
        continue;
      }

      const slot = pedestal.getValue(Pedestal, 'slot') ?? 0;
      const arch = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
      spawnWeapon(this.world, arch, slot);
      pedestal.setValue(Pedestal, 'occupied', true);
    }
  }
}
