/**
 * Keeps the pedestals stocked during a match: any unoccupied pedestal counts
 * down its respawn timer and then materialises a fresh random weapon.
 *
 * In the lobby (app.state !== 'playing') the pedestals and any loose weapons are
 * hidden/cleared and nothing spawns, so the menu space stays clean.
 */

import { createSystem } from '@iwsdk/core';
import { Pedestal } from '../components/Pedestal.js';
import { Weapon } from '../components/Weapon.js';
import { app } from '../menu/appState.js';
import { ARCHETYPES } from '../weapons/archetypes.js';
import { spawnWeapon } from '../weapons/setup.js';

export class WeaponSpawnSystem extends createSystem({
  pedestals: { required: [Pedestal] },
  weapons: { required: [Weapon] },
}) {
  private wasPlaying = false;

  update(delta: number): void {
    const playing = app.state === 'playing';

    // Pedestals are only visible during a match.
    for (const pedestal of this.queries.pedestals.entities) {
      if (pedestal.object3D) pedestal.object3D.visible = playing;
    }

    if (!playing) {
      // Leaving a match → clear loose weapons and mark pedestals empty so they
      // restock cleanly next time.
      if (this.wasPlaying) {
        for (const w of [...this.queries.weapons.entities]) w.destroy();
        for (const pedestal of this.queries.pedestals.entities) {
          pedestal.setValue(Pedestal, 'occupied', false);
          pedestal.setValue(Pedestal, 'respawnTimer', 0);
        }
      }
      this.wasPlaying = false;
      return;
    }
    this.wasPlaying = true;

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
