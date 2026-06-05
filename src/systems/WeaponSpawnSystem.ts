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

import { createSystem, type Entity, type Object3D } from '@iwsdk/core';
import { Box3, Plane, Vector3 } from 'three';
import { Pedestal } from '../components/Pedestal.js';
import { Weapon } from '../components/Weapon.js';
import { app } from '../menu/appState.js';
import { buildWeaponMesh, getArchetype } from '../weapons/archetypes.js';
import { spawnWeapon, slotParkPosition } from '../weapons/setup.js';
import { loadout } from '../menu/loadout.js';
import * as sfx from '../audio/sfx.js';

type MeshLike = Object3D & { material?: { transparent: boolean; opacity: number; depthWrite: boolean } | Array<{ transparent: boolean; opacity: number; depthWrite: boolean }>; geometry?: { dispose(): void } };

export class WeaponSpawnSystem extends createSystem({
  pedestals: { required: [Pedestal] },
  weapons: { required: [Weapon] },
}) {
  private wasPlaying = false;
  private activeSlot: number | null = null; // the one slot currently respawning
  private respawnTimer = 0;
  private respawnTotal = 1;
  private ghost?: Object3D; // translucent preview that fills in top→bottom
  private ghostPlane?: Plane;
  private ghostYMin = 0;
  private ghostYMax = 0;
  private clipEnabled = false;

  update(delta: number): void {
    if (!this.clipEnabled) {
      this.world.renderer.localClippingEnabled = true;
      this.clipEnabled = true;
    }
    if (app.state !== 'playing') {
      if (this.wasPlaying) {
        for (const w of [...this.queries.weapons.entities]) w.destroy();
        for (const p of this.queries.pedestals.entities) p.setValue(Pedestal, 'occupied', false);
        this.activeSlot = null;
        this.respawnTimer = 0;
        this.clearGhost();
      }
      this.wasPlaying = false;
      return;
    }

    if (!this.wasPlaying) {
      // Match start: fill every spot instantly with its fixed weapon type.
      for (const p of this.queries.pedestals.entities) {
        const slot = p.getValue(Pedestal, 'slot') ?? 0;
        spawnWeapon(this.world, getArchetype(loadout.slots[slot]), slot);
        p.setValue(Pedestal, 'occupied', true);
      }
      this.activeSlot = null;
      this.respawnTimer = 0;
      this.wasPlaying = true;
      return;
    }

    // A respawn is in progress: tick it; fill the ghost; spawn when done.
    if (this.activeSlot !== null) {
      this.respawnTimer -= delta;
      const progress = Math.max(0, Math.min(1, 1 - this.respawnTimer / this.respawnTotal));
      this.updateGhost(progress, delta);
      if (this.respawnTimer <= 0) {
        const ped = this.findPedestal(this.activeSlot);
        if (ped && !ped.getValue(Pedestal, 'occupied')) {
          spawnWeapon(this.world, getArchetype(loadout.slots[this.activeSlot]), this.activeSlot);
          ped.setValue(Pedestal, 'occupied', true);
          sfx.weaponReady();
        }
        this.clearGhost();
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
      this.respawnTotal = getArchetype(loadout.slots[nextSlot]).respawn;
      this.respawnTimer = this.respawnTotal;
      this.spawnGhost(nextSlot);
    }
  }

  /**
   * Build a ghostly (constant-opacity) preview of the incoming weapon at its
   * spot, clipped so it reveals from the TOP down as it nears spawn.
   */
  private spawnGhost(slot: number): void {
    this.clearGhost();
    const ghost = buildWeaponMesh(getArchetype(loadout.slots[slot]));
    const [x, y, z] = slotParkPosition(slot);
    ghost.position.set(x, y, z);
    this.scene.add(ghost);

    const box = new Box3().setFromObject(ghost);
    this.ghostYMin = box.min.y;
    this.ghostYMax = box.max.y;
    // Normal +Y, keep where y >= -constant; start with nothing revealed.
    const plane = new Plane(new Vector3(0, 1, 0), -this.ghostYMax);
    this.ghostPlane = plane;

    ghost.traverse((o) => {
      const m = o as MeshLike;
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        mat.transparent = true;
        mat.depthWrite = false;
        mat.opacity = 0.4; // stays ghostly until it actually spawns
        (mat as unknown as { clippingPlanes?: Plane[] }).clippingPlanes = [plane];
      }
    });
    this.ghost = ghost;
  }

  /** Reveal the ghost from the top down as progress climbs + a gentle spin. */
  private updateGhost(progress: number, delta: number): void {
    const ghost = this.ghost;
    if (!ghost || !this.ghostPlane) return;
    ghost.rotation.y += delta * 0.9;
    const cutoff = this.ghostYMax - progress * (this.ghostYMax - this.ghostYMin);
    this.ghostPlane.constant = -cutoff;
  }

  private clearGhost(): void {
    const ghost = this.ghost;
    if (!ghost) return;
    this.scene.remove(ghost);
    ghost.traverse((o) => {
      const m = o as MeshLike;
      m.geometry?.dispose?.();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) (mat as unknown as { dispose?: () => void }).dispose?.();
    });
    this.ghost = undefined;
    this.ghostPlane = undefined;
  }

  private findPedestal(slot: number): Entity | undefined {
    for (const p of this.queries.pedestals.entities) {
      if ((p.getValue(Pedestal, 'slot') ?? -1) === slot) return p;
    }
    return undefined;
  }
}
