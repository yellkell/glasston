/**
 * Drives the lobby + customizer: builds the floating panels, draws a controller
 * laser pointer, raycasts for hover/click, runs Play / vs-Bots / Cancel and the
 * character customizer (skin/pattern/colour with a live preview cat), and shows
 * or hides the match world vs. the menu vs. the customizer based on `app.state`.
 */

import { createSystem, InputComponent } from '@iwsdk/core';
import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Raycaster,
  SphereGeometry,
  Vector3,
  type Intersection,
} from 'three';
import { app, type AppState } from '../menu/appState.js';
import { createMenu, type Menu, type PanelId } from '../menu/menu.js';
import { createPresetPanel, type PresetPanel, type PresetAction } from '../menu/presetPanel.js';
import { createLoadoutPanel, type LoadoutPanel } from '../menu/loadoutPanel.js';
import { loadout, saveLoadout } from '../menu/loadout.js';
import { buildPreviewCat } from '../character/cat.js';
import { playerSkin, saveSkin } from '../menu/skin.js';
import { findPresetForSkin, getPreset } from '../menu/catPresets.js';
import type { CustomizeTab } from '../menu/tabs.js';
import * as sfx from '../audio/sfx.js';
import {
  createCatAnimationState,
  updateIdleAnimations,
  updatePawTracking,
  updateLookAt,
  playExcitedBounce,
  type CatAnimationState,
} from '../character/catAnimations.js';
import { playPawTapAnimation } from '../character/catPaw.js';

const _origin = new Vector3();
const _dir = new Vector3();
const _end = new Vector3();

interface Pointer {
  line: Line;
  dot: Mesh;
}

export class MenuSystem extends createSystem({}) {
  private menu!: Menu;
  private presetPanel!: PresetPanel;
  private loadoutPanel!: LoadoutPanel;
  private tab: CustomizeTab = 'cat';
  private menuMeshes: Mesh[] = [];
  private previewHolder = new Group();
  private ray = new Raycaster();
  private hovered: PanelId | null = null;
  private lastState: AppState | null = null;
  private pointers: Record<'left' | 'right', Pointer> = {} as Record<'left' | 'right', Pointer>;
  private catAnimState: CatAnimationState = createCatAnimationState();

  init(): void {
    this.menu = createMenu(this.scene);
    this.menuMeshes = [this.menu.byId.play.mesh, this.menu.byId.bots.mesh, this.menu.byId.customize.mesh];

    this.presetPanel = createPresetPanel(findPresetForSkin(playerSkin)?.id ?? '');
    this.presetPanel.mesh.position.set(0.5, 1.4, -1.15);
    this.presetPanel.mesh.rotation.y = -0.35;
    this.scene.add(this.presetPanel.mesh);
    this.presetPanel.redraw();

    this.loadoutPanel = createLoadoutPanel();
    this.loadoutPanel.mesh.position.copy(this.presetPanel.mesh.position);
    this.loadoutPanel.mesh.rotation.copy(this.presetPanel.mesh.rotation);
    this.scene.add(this.loadoutPanel.mesh);

    this.previewHolder.position.set(-0.45, 1.12, -1.2);
    this.scene.add(this.previewHolder);
    this.rebuildPreview();

    this.pointers.left = this.makePointer();
    this.pointers.right = this.makePointer();

    this.applyState();
  }

  update(delta: number): void {
    if (app.state !== this.lastState) this.applyState();

    if (app.state === 'playing') {
      this.hidePointers();
      return;
    }

    if (app.state === 'customize') {
      // Bongo Cat animations for preview
      const previewCat = this.previewHolder.children[0] as Group | undefined;
      if (previewCat && this.tab === 'cat') {
        // Idle animations (breathing, blinking, ear twitches)
        updateIdleAnimations(previewCat, this.catAnimState, delta);

        // Paw tracking - get controller grip positions
        const leftGrip = this.world.playerSpaceEntities.gripSpaces.left?.object3D;
        const rightGrip = this.world.playerSpaceEntities.gripSpaces.right?.object3D;
        const leftPos = leftGrip ? new Vector3().setFromMatrixPosition(leftGrip.matrixWorld) : null;
        const rightPos = rightGrip ? new Vector3().setFromMatrixPosition(rightGrip.matrixWorld) : null;
        updatePawTracking(previewCat, this.catAnimState, leftPos, rightPos, delta);

        // Look at controller ray intersection
        const lookTarget = this.pointers.left.dot.visible ? this.pointers.left.dot.position.clone() : null;
        updateLookAt(previewCat, this.catAnimState, lookTarget, delta);
      }

      // Slow rotation for better viewing
      this.previewHolder.rotation.y += delta * 0.3;

      const editor = this.tab === 'cat' ? this.presetPanel.mesh : this.loadoutPanel.mesh;
      for (const hand of ['left', 'right'] as const) {
        const hit = this.updatePointer(hand, [editor]);
        if (hit && hit.uv && this.input.xr.gamepads[hand]?.getButtonDown(InputComponent.Trigger)) {
          // Play paw tap animation on trigger press
          if (previewCat && this.tab === 'cat') {
            const paw = previewCat.children.find(c => c.name === `${hand}-paw`);
            if (paw) playPawTapAnimation(paw);
          }

          if (this.tab === 'cat') {
            const a = this.presetPanel.hitTest(hit.uv.x, hit.uv.y);
            if (a) this.applyPresetSelection(a);
          } else {
            const a = this.loadoutPanel.hitTest(hit.uv.x, hit.uv.y);
            if (a) this.applyLoadout(a);
          }
        }
      }
      return;
    }

    // Lobby (menu / queueing): hover + click the three panels.
    let hover: PanelId | null = null;
    const gamepads = this.input.xr.gamepads;
    for (const hand of ['left', 'right'] as const) {
      const hit = this.updatePointer(hand, this.menuMeshes);
      if (!hit) continue;
      const id = this.panelIdOf(hit.object as Mesh);
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

  // --- controller pointer ---

  private makePointer(): Pointer {
    const geo = new BufferGeometry().setFromPoints([new Vector3(), new Vector3(0, 0, -1)]);
    const line = new Line(geo, new LineBasicMaterial({ color: 0x4fd8e6, transparent: true, opacity: 0.85 }));
    line.name = 'menu-pointer';
    line.frustumCulled = false;
    const dot = new Mesh(new SphereGeometry(0.012, 12, 10), new MeshBasicMaterial({ color: 0x4fd8e6 }));
    dot.visible = false;
    this.scene.add(line);
    this.scene.add(dot);
    return { line, dot };
  }

  /** Point the laser down the hand's ray, snap its end + dot to any hit. */
  private updatePointer(hand: 'left' | 'right', targets: Object3D[]): Intersection | undefined {
    const p = this.pointers[hand];
    const rayObj = this.world.playerSpaceEntities.raySpaces[hand]?.object3D;
    if (!rayObj) {
      p.line.visible = false;
      p.dot.visible = false;
      return undefined;
    }
    rayObj.getWorldPosition(_origin);
    rayObj.getWorldDirection(_dir).negate(); // ray space points down −Z
    this.ray.set(_origin, _dir);
    const hit = this.ray.intersectObjects(targets, false)[0];
    _end.copy(hit ? hit.point : _origin.clone().addScaledVector(_dir, 1.6));
    const pos = p.line.geometry.getAttribute('position');
    pos.setXYZ(0, _origin.x, _origin.y, _origin.z);
    pos.setXYZ(1, _end.x, _end.y, _end.z);
    pos.needsUpdate = true;
    p.line.visible = true;
    if (hit) {
      p.dot.position.copy(hit.point);
      p.dot.visible = true;
    } else {
      p.dot.visible = false;
    }
    return hit;
  }

  private hidePointers(): void {
    for (const hand of ['left', 'right'] as const) {
      this.pointers[hand].line.visible = false;
      this.pointers[hand].dot.visible = false;
    }
  }

  private panelIdOf(mesh: Mesh): PanelId | null {
    for (const p of this.menu.panels) if (p.mesh === mesh) return p.id;
    return null;
  }

  // --- customizer ---

  private applyPresetSelection(action: PresetAction): void {
    sfx.ensureAudio();
    sfx.uiClick();

    if (action.kind === 'tab') {
      this.setTab(action.to);
      return;
    }
    if (action.kind === 'done') {
      app.state = 'menu';
      this.applyState();
      return;
    }

    const preset = getPreset(action.presetId);
    if (!preset) return;

    // Update player skin with preset
    playerSkin.fur = preset.skin.fur;
    playerSkin.accent = preset.skin.accent;
    playerSkin.pattern = preset.skin.pattern;

    // Update panel state
    this.presetPanel.selectedId = action.presetId;
    this.presetPanel.redraw();

    // Save and rebuild preview
    saveSkin();
    this.rebuildPreview();

    // Play excited bounce when selecting
    const previewCat = this.previewHolder.children[0] as Group | undefined;
    if (previewCat) playExcitedBounce(previewCat);
  }

  private applyLoadout(action: ReturnType<LoadoutPanel['hitTest']>): void {
    if (!action) return;
    sfx.ensureAudio();
    sfx.uiClick();
    if (action.kind === 'tab') {
      this.setTab(action.to);
      return;
    }
    if (action.kind === 'done') {
      app.state = 'menu';
      this.applyState();
      return;
    }
    if (action.kind === 'select') {
      // Toggle selection: if clicking same slot, deselect; otherwise select
      if (this.loadoutPanel.selectedSlot === action.spot) {
        this.loadoutPanel.selectedSlot = null;
      } else if (this.loadoutPanel.selectedSlot === null) {
        // First selection
        this.loadoutPanel.selectedSlot = action.spot;
      } else {
        // Second selection - swap weapons
        const fromSlot = this.loadoutPanel.selectedSlot;
        const toSlot = action.spot;
        const temp = loadout.slots[fromSlot];
        loadout.slots[fromSlot] = loadout.slots[toSlot];
        loadout.slots[toSlot] = temp;
        this.loadoutPanel.selectedSlot = null;
        saveLoadout();
      }
      this.loadoutPanel.redraw();
    } else if (action.kind === 'curve') {
      loadout.curve[action.t] = !loadout.curve[action.t];
      saveLoadout();
      this.loadoutPanel.redraw();
    }
  }

  private setTab(tab: CustomizeTab): void {
    this.tab = tab;
    this.applyState();
  }

  private rebuildPreview(): void {
    for (const child of [...this.previewHolder.children]) {
      child.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as { dispose?: () => void } | undefined;
        mat?.dispose?.();
      });
      this.previewHolder.remove(child);
    }
    // Use preview cat with Bongo Cat paws
    const cat = buildPreviewCat(playerSkin);
    cat.scale.setScalar(1.3);
    this.previewHolder.add(cat);
    // Reset animation state
    this.catAnimState = createCatAnimationState();
  }

  // --- transitions + visibility ---

  private activate(id: PanelId): void {
    sfx.ensureAudio();
    sfx.uiClick();
    if (id === 'play') {
      if (app.state === 'menu') app.state = app.vsBots ? 'playing' : 'queueing';
      else if (app.state === 'queueing') app.state = 'menu';
    } else if (id === 'bots') {
      if (app.state !== 'playing') app.vsBots = !app.vsBots;
    } else if (id === 'customize') {
      app.state = 'customize';
    }
    this.applyState();
  }

  private applyState(): void {
    const playing = app.state === 'playing';
    const customizing = app.state === 'customize';
    this.menu.setVisible(!playing && !customizing);
    this.presetPanel.mesh.visible = customizing && this.tab === 'cat';
    this.loadoutPanel.mesh.visible = customizing && this.tab === 'loadout';
    this.previewHolder.visible = customizing && this.tab === 'cat';

    const cat = this.scene.getObjectByName('opponent');
    if (cat) cat.visible = playing;
    const ring = this.scene.getObjectByName('opponent-platform');
    if (ring) ring.visible = playing;
    // "Play BLASTO" signage shows only in the menu area, not during a match.
    const banner = this.scene.getObjectByName('title-banner');
    if (banner) banner.visible = !playing;

    if (!playing && !customizing) this.menu.redrawAll(this.hovered);
    this.lastState = app.state;
  }
}
