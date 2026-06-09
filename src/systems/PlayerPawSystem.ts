/**
 * Gives the player kawaii cat paws during a match: a Bongo Cat-style paw
 * (character/catPaw.ts) parented to each controller grip space, built from the
 * player's chosen skin so your hands match your customized cat. The paws curl
 * when you squeeze the grip (grabbing a blaster) and are hidden in the lobby
 * and customizer, where the laser pointers do the talking.
 */

import { createSystem, InputComponent, type Group } from '@iwsdk/core';
import { buildCatPaw, setPawGrip } from '../character/catPaw.js';
import { playerSkin } from '../menu/skin.js';
import { app } from '../menu/appState.js';

type Hand = 'left' | 'right';

interface PawRig {
  paw: Group;
  fur: number;
  accent: number;
  gripping: boolean;
}

export class PlayerPawSystem extends createSystem({}) {
  private rigs: Partial<Record<Hand, PawRig>> = {};

  update(): void {
    const playing = app.state === 'playing';

    for (const hand of ['left', 'right'] as const) {
      const gripObj = this.world.playerSpaceEntities.gripSpaces[hand]?.object3D;
      if (!gripObj) continue;

      let rig = this.rigs[hand];

      // (Re)build the paw when first seen or when the skin changed.
      if (!rig || rig.fur !== playerSkin.fur || rig.accent !== playerSkin.accent) {
        if (rig) {
          rig.paw.parent?.remove(rig.paw);
          rig.paw.traverse((o) => {
            const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose?(): void } };
            m.geometry?.dispose();
            m.material?.dispose?.();
          });
        }
        const paw = buildCatPaw(playerSkin);
        paw.position.set(0, -0.01, 0.02); // nestle over the controller body
        gripObj.add(paw);
        rig = { paw, fur: playerSkin.fur, accent: playerSkin.accent, gripping: false };
        this.rigs[hand] = rig;
      }

      rig.paw.visible = playing;
      if (!playing) continue;

      // Curl the paw while the grip is squeezed (holding a blaster).
      const gp = this.input.xr.gamepads[hand];
      if (gp?.getButtonDown(InputComponent.Squeeze) && !rig.gripping) {
        rig.gripping = true;
        setPawGrip(rig.paw, true);
      } else if (gp?.getButtonUp(InputComponent.Squeeze) && rig.gripping) {
        rig.gripping = false;
        setPawGrip(rig.paw, false);
      }
    }
  }
}
