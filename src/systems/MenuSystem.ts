/**
 * Drives the lobby menu: builds the three floating panels, raycasts the
 * controllers against them for hover + click, runs the Play / vs-Bots / Cancel
 * transitions, and shows/hides the match world (cat opponent + its platform)
 * vs. the menu based on `app.state`.
 *
 * Interaction is custom raycasting (origin + −Z of each controller's ray space)
 * rather than IWSDK's pointer kit, so the buttons behave exactly how we want.
 */

import { createSystem, InputComponent } from '@iwsdk/core';
import { Raycaster, Vector3, type Mesh } from 'three';
import { app, type AppState } from '../menu/appState.js';
import { createMenu, type Menu, type PanelId } from '../menu/menu.js';
import * as sfx from '../audio/sfx.js';

const _origin = new Vector3();
const _dir = new Vector3();

export class MenuSystem extends createSystem({}) {
  private menu!: Menu;
  private interactive: Mesh[] = [];
  private ray = new Raycaster();
  private hovered: PanelId | null = null;
  private lastState: AppState | null = null;

  init(): void {
    this.menu = createMenu(this.scene);
    this.interactive = [this.menu.byId.play.mesh, this.menu.byId.bots.mesh];
    this.applyState();
  }

  update(): void {
    // React to state changes driven elsewhere (e.g. match over → back to menu).
    if (app.state !== this.lastState) this.applyState();

    if (app.state === 'playing') return; // menu hidden during a match

    // Hover + click via controller rays.
    let hover: PanelId | null = null;
    const gamepads = this.input.xr.gamepads;
    for (const hand of ['left', 'right'] as const) {
      const rayObj = this.world.playerSpaceEntities.raySpaces[hand]?.object3D;
      if (!rayObj) continue;
      rayObj.getWorldPosition(_origin);
      rayObj.getWorldDirection(_dir).negate(); // ray space points down −Z
      this.ray.set(_origin, _dir);
      const hit = this.ray.intersectObjects(this.interactive, false)[0];
      const id = hit ? (hit.object.userData.panelId as PanelId | undefined) ?? this.panelIdOf(hit.object as Mesh) : null;
      if (id) {
        hover = id;
        if (gamepads[hand]?.getButtonDown(InputComponent.Trigger)) this.activate(id);
      }
    }

    if (hover !== this.hovered) {
      this.hovered = hover;
      this.menu.redrawAll(hover);
    }
  }

  private panelIdOf(mesh: Mesh): PanelId | null {
    for (const p of this.menu.panels) if (p.mesh === mesh) return p.id;
    return null;
  }

  private activate(id: PanelId): void {
    sfx.ensureAudio(); // this click is a user gesture — unlock audio
    sfx.uiClick();
    if (id === 'play') {
      if (app.state === 'menu') app.state = app.vsBots ? 'playing' : 'queueing';
      else if (app.state === 'queueing') app.state = 'menu';
    } else if (id === 'bots') {
      if (app.state !== 'playing') app.vsBots = !app.vsBots;
    }
    this.applyState();
  }

  /** Sync visibility + panel art to the current app state. */
  private applyState(): void {
    const playing = app.state === 'playing';
    this.menu.setVisible(!playing);
    const cat = this.scene.getObjectByName('opponent');
    if (cat) cat.visible = playing;
    const ring = this.scene.getObjectByName('opponent-platform');
    if (ring) ring.visible = playing;
    if (!playing) this.menu.redrawAll(this.hovered);
    this.lastState = app.state;
  }
}
