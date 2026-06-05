/**
 * The lobby menu: three frosted-pastel panels on a shallow arc in front of the
 * player, tilted inward. Left = "Play vs Bots" toggle, centre = big PLAY (or
 * SEARCHING/CANCEL while queueing), right = Multiplayer status. Each panel is a
 * canvas texture (crisp text, cheap) on a plane; MenuSystem raycasts the
 * controller against the meshes for hover + click.
 */

import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Scene,
} from '@iwsdk/core';
import { app } from './appState.js';

export type PanelId = 'play' | 'bots' | 'customize';

export interface MenuPanel {
  id: PanelId;
  mesh: Mesh;
  redraw: (hover: boolean) => void;
}

export interface Menu {
  group: Group;
  panels: MenuPanel[];
  byId: Record<PanelId, MenuPanel>;
  setVisible: (v: boolean) => void;
  redrawAll: (hoverId: PanelId | null) => void;
}

/** Right panel — opens the character customizer. */
function drawCustomize(ctx: CanvasRenderingContext2D, hover: boolean): void {
  ctx.fillStyle = '#6a4fb0';
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText('CUSTOMISE', PW / 2, 70);
  // Button.
  const bx = 90, by = 150, bw = PW - 180, bh = 96;
  roundRect(ctx, bx, by, bw, bh, 48);
  const g = ctx.createLinearGradient(bx, by, bx, by + bh);
  g.addColorStop(0, hover ? '#e0b3ff' : '#cf9cff');
  g.addColorStop(1, hover ? '#b98cff' : '#a877f0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText('YOUR CAT', PW / 2, by + bh / 2 + 2);
  ctx.fillStyle = '#7a6aa0';
  ctx.font = '500 26px system-ui, sans-serif';
  ctx.fillText('Skin · pattern · colour', PW / 2, PH - 70);
  ctx.fillText('Multiplayer coming soon', PW / 2, PH - 36);
}

const PW = 512;
const PH = 384;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panelBg(ctx: CanvasRenderingContext2D, hover: boolean): void {
  ctx.clearRect(0, 0, PW, PH);
  const g = ctx.createLinearGradient(0, 0, 0, PH);
  g.addColorStop(0, hover ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.82)');
  g.addColorStop(1, hover ? 'rgba(226,240,255,0.9)' : 'rgba(224,228,255,0.8)');
  roundRect(ctx, 12, 12, PW - 24, PH - 24, 40);
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(120,90,200,0.5)';
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.shadowBlur = 0;
  roundRect(ctx, 12, 12, PW - 24, PH - 24, 40);
  ctx.lineWidth = 4;
  ctx.strokeStyle = hover ? 'rgba(79,216,230,0.95)' : 'rgba(185,140,255,0.6)';
  ctx.stroke();
}

function makePanel(id: PanelId, wMeters: number, hMeters: number, draw: (ctx: CanvasRenderingContext2D, hover: boolean) => void): MenuPanel {
  const canvas = document.createElement('canvas');
  canvas.width = PW;
  canvas.height = PH;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  const mesh = new Mesh(
    new PlaneGeometry(wMeters, hMeters),
    new MeshBasicMaterial({ map: texture, transparent: true }),
  );
  mesh.name = `menu-panel:${id}`;
  const redraw = (hover: boolean): void => {
    panelBg(ctx, hover);
    draw(ctx, hover);
    texture.needsUpdate = true;
  };
  return { id, mesh, redraw };
}

/** Centre PLAY button — also the CANCEL control while queueing. */
function drawPlay(ctx: CanvasRenderingContext2D, hover: boolean): void {
  const queueing = app.state === 'queueing';
  // Big pill button.
  const bx = 70, by = 150, bw = PW - 140, bh = 150;
  const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
  if (queueing) {
    grad.addColorStop(0, '#ffd27a');
    grad.addColorStop(1, '#ff9ad6');
  } else {
    grad.addColorStop(0, hover ? '#7af0ff' : '#5fdfe8');
    grad.addColorStop(1, hover ? '#54c8ff' : '#46b8ff');
  }
  roundRect(ctx, bx, by, bw, bh, 75);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px system-ui, sans-serif';
  ctx.fillText(queueing ? 'CANCEL' : 'PLAY', PW / 2, by + bh / 2 + 4);

  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillStyle = '#6a4fb0';
  if (queueing) {
    ctx.fillText('Searching for an opponent…', PW / 2, 80);
    ctx.fillText('tap to stop', PW / 2, PH - 60);
  } else {
    ctx.fillText('BLASTO', PW / 2, 80);
    ctx.fillText(app.vsBots ? 'vs Bots' : 'Online (queue)', PW / 2, PH - 60);
  }
}

/** Left panel — the bots toggle/sign. */
function drawBots(ctx: CanvasRenderingContext2D, hover: boolean): void {
  ctx.fillStyle = '#6a4fb0';
  ctx.font = '800 40px system-ui, sans-serif';
  ctx.fillText('PLAY VS BOTS', PW / 2, 70);

  // ON/OFF pill.
  const on = app.vsBots;
  const pw = 220, ph = 92, px = (PW - pw) / 2, py = 150;
  roundRect(ctx, px, py, pw, ph, ph / 2);
  ctx.fillStyle = on ? '#5fd07a' : 'rgba(150,120,190,0.35)';
  ctx.fill();
  // knob
  const kr = ph / 2 - 10;
  const kx = on ? px + pw - kr - 12 : px + kr + 12;
  ctx.beginPath();
  ctx.arc(kx, py + ph / 2, kr, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = on ? '#2f8a4a' : '#7a6aa0';
  ctx.font = '900 40px system-ui, sans-serif';
  ctx.fillText(on ? 'ON' : 'OFF', on ? px + 64 : px + pw - 64, py + ph / 2 + 2);

  ctx.fillStyle = '#6a4fb0';
  ctx.font = '500 26px system-ui, sans-serif';
  ctx.fillText(on ? 'Warm up vs bots while you queue' : 'Wait in the lobby for players', PW / 2, PH - 70);
  ctx.fillText(hover ? '(tap to toggle)' : '', PW / 2, PH - 36);
}

export function createMenu(scene: Scene): Menu {
  const group = new Group();
  group.name = 'lobby-menu';

  const play = makePanel('play', 0.92, 0.7, drawPlay);
  const bots = makePanel('bots', 0.74, 0.56, drawBots);
  const customize = makePanel('customize', 0.74, 0.56, drawCustomize);

  // Shallow arc in front of the player, tilted inward toward the centre.
  const y = 1.45;
  play.mesh.position.set(0, y, -1.3);
  bots.mesh.position.set(-0.82, y - 0.02, -1.06);
  bots.mesh.rotation.y = 0.46;
  customize.mesh.position.set(0.82, y - 0.02, -1.06);
  customize.mesh.rotation.y = -0.46;

  const panels = [play, bots, customize];
  for (const p of panels) {
    p.redraw(false);
    group.add(p.mesh);
  }
  scene.add(group);

  const byId = { play, bots, customize } as Record<PanelId, MenuPanel>;
  return {
    group,
    panels,
    byId,
    setVisible: (v) => { group.visible = v; },
    redrawAll: (hoverId) => { for (const p of panels) p.redraw(p.id === hoverId); },
  };
}
