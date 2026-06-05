/**
 * Stocks the six floating weapon spots during a match.
 *
 * Rules:
 *  - Each spot has a FIXED weapon type (see PEDESTAL_SLOTS): side spots hold the
 *    lighter weapons, the two back spots hold the powerful Lobber.
 *  - When a match starts, every spot is filled instantly.
 *  - When a weapon is consumed/dropped, its spot empties and must respawn — but
 *    ONLY ONE weapon respawns at a time. Empty spots queue in the order they
 *    emptied (FIFO) and each takes its weapon type's respawn time (2–5s,
 *    weak→strong).
 *
 * In the lobby everything is cleared and nothing spawns.
 */

import { createSystem, type Entity } from '@iwsdk/core';
import { Pedestal } from '../components/Pedestal.js';
import { Weapon } from '../components/Weapon.js';
import { app } from '../menu/appState.js';
import { getArchetype } from '../weapons/archetypes.js';
import { spawnWeapon } from '../weapons/setup.js';
import { PEDESTAL_SLOTS } from '../config.js';

export class WeaponSpawnSystem extends createSystem({
  pedestals: { required: [Pedestal] },
  weapons: { required: [Weapon] },
}) {
  private wasPlaying = false;
  private activeSlot: number | null = null; // the one slot currently respawning
  private respawnTimer = 0;

  update(delta: number): void {
    if (app.state !== 'playing') {
      if (this.wasPlaying) {
        for (const w of [...this.queries.weapons.entities]) w.destroy();
        for (const p of this.queries.pedestals.entities) p.setValue(Pedestal, 'occupied', false);
        this.activeSlot = null;
        this.respawnTimer = 0;
      }
      this.wasPlaying = false;
      return;
    }

    if (!this.wasPlaying) {
      // Match start: fill every spot instantly with its fixed weapon type.
      for (const p of this.queries.pedestals.entities) {
        const slot = p.getValue(Pedestal, 'slot') ?? 0;
        spawnWeapon(this.world, getArchetype(PEDESTAL_SLOTS[slot].type), slot);
        p.setValue(Pedestal, 'occupied', true);
      }
      this.activeSlot = null;
      this.respawnTimer = 0;
      this.wasPlaying = true;
      return;
    }

    // A respawn is in progress: tick it; spawn when done.
    if (this.activeSlot !== null) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        const ped = this.findPedestal(this.activeSlot);
        if (ped && !ped.getValue(Pedestal, 'occupied')) {
          spawnWeapon(this.world, getArchetype(PEDESTAL_SLOTS[this.activeSlot].type), this.activeSlot);
          ped.setValue(Pedestal, 'occupied', true);
        }
        this.activeSlot = null;
      }
      return;
    }

    // Otherwise start the next respawn: the earliest-emptied spot.
    let nextSlot: number | null = null;
    let nextOrder = Infinity;
    for (const p of this.queries.pedestals.entities) {
      if (p.getValue(Pedestal, 'occupied')) continue;
      const order = p.getValue(Pedestal, 'emptyOrder') ?? 0;
      if (order < nextOrder) {
        nextOrder = order;
        nextSlot = p.getValue(Pedestal, 'slot') ?? 0;
      }
    }
    if (nextSlot !== null) {
      this.activeSlot = nextSlot;
      this.respawnTimer = getArchetype(PEDESTAL_SLOTS[nextSlot].type).respawn;
    }
  }

  private findPedestal(slot: number): Entity | undefined {
    for (const p of this.queries.pedestals.entities) {
      if ((p.getValue(Pedestal, 'slot') ?? -1) === slot) return p;
    }
    return undefined;
  }
}
