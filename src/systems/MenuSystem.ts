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
import { createCustomizer, type Customizer } from '../menu/customizer.js';
import { buildCat } from '../character/cat.js';
import { ACCENT_COLORS, FUR_COLORS, PATTERNS, playerSkin, saveSkin } from '../menu/skin.js';
import * as sfx from '../audio/sfx.js';

const _origin = new Vector3();
const _dir = new Vector3();
const _end = new Vector3();

interface Pointer {
  line: Line;
  dot: Mesh;
}

export class MenuSystem extends createSystem({}) {
  private menu!: Menu;
  private customizer!: Customizer;
  private menuMeshes: Mesh[] = [];
  private previewHolder = new Group();
  private ray = new Raycaster();
  private hovered: PanelId | null = null;
  private lastState: AppState | null = null;
  private pointers: Record<'left' | 'right', Pointer> = {} as Record<'left' | 'right', Pointer>;

  init(): void {
    this.menu = createMenu(this.scene);
    this.menuMeshes = [this.menu.byId.play.mesh, this.menu.byId.bots.mesh, this.menu.byId.customize.mesh];

    this.customizer = createCustomizer();
    this.customizer.mesh.position.set(0.5, 1.4, -1.15);
    this.customizer.mesh.rotation.y = -0.35;
    this.scene.add(this.customizer.mesh);

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
      this.previewHolder.rotation.y += delta * 0.5;
      for (const hand of ['left', 'right'] as const) {
        const hit = this.updatePointer(hand, [this.customizer.mesh]);
        if (hit && hit.uv && this.input.xr.gamepads[hand]?.getButtonDown(InputComponent.Trigger)) {
          const action = this.customizer.hitTest(hit.uv.x, hit.uv.y);
          if (action) this.applyCustomize(action);
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

  private applyCustomize(action: ReturnType<Customizer['hitTest']>): void {
    if (!action) return;
    sfx.ensureAudio();
    sfx.uiClick();
    if (action.kind === 'done') {
      app.state = 'menu';
      this.applyState();
      return;
    }
    if (action.kind === 'fur') playerSkin.fur = FUR_COLORS[action.i];
    else if (action.kind === 'accent') playerSkin.accent = ACCENT_COLORS[action.i];
    else if (action.kind === 'pattern') playerSkin.pattern = PATTERNS[action.i];
    saveSkin();
    this.customizer.redraw();
    this.rebuildPreview();
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
    const cat = buildCat(playerSkin);
    cat.scale.setScalar(1.3);
    this.previewHolder.add(cat);
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
    this.customizer.mesh.visible = customizing;
    this.previewHolder.visible = customizing;

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
