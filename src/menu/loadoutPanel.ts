/**
 * The Loadout editor panel: choose which weapon sits in each of the six spots
 * (tap a spot to cycle its weapon), and tick weapons to make them "curve"
 * weapons. One canvas plane; clicks resolved by the raycast hit's UV. Reads/
 * writes the shared `loadout`.
 */

import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { ARCHETYPES } from '../weapons/archetypes.js';
import { loadout } from './loadout.js';
import { drawTabs, tabHit, type CustomizeTab } from './tabs.js';

export type LoadoutAction =
  | { kind: 'tab'; to: CustomizeTab }
  | { kind: 'assign'; spot: number; weapon: number }
  | { kind: 'select'; spot: number }
  | { kind: 'swap'; fromSpot: number; toSpot: number }
  | { kind: 'curve'; t: number }
  | { kind: 'done' };

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  action: LoadoutAction;
}

const W = 512;
const H = 720;
const SPOT_LABELS = ['Front L', 'Front R', 'Mid L', 'Mid R', 'Back L', 'Back R'];

export interface LoadoutPanel {
  mesh: Mesh;
  selectedSlot: number | null;
  redraw: () => void;
  hitTest: (u: number, v: number) => LoadoutAction | null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function layout(): Cell[] {
  const cells: Cell[] = [];
  // Six spot rows - now each row is a single clickable area for selection/swapping
  const spotH = 68, spotGap = 8, x0 = 24, y0 = 104;
  const spotW = W - 48;
  for (let spot = 0; spot < 6; spot++) {
    const spotY = y0 + spot * (spotH + spotGap);
    cells.push({
      x: x0,
      y: spotY,
      w: spotW,
      h: spotH,
      action: { kind: 'select', spot },
    });
  }
  // Curve toggles: one row per weapon type.
  const rh = 46, ry0 = 560;
  for (let t = 0; t < ARCHETYPES.length; t++) {
    cells.push({ x: 24, y: ry0 + t * (rh + 8), w: W - 48, h: rh, action: { kind: 'curve', t } });
  }
  cells.push({ x: 126, y: 680, w: 260, h: 32, action: { kind: 'done' } });
  return cells;
}

export function createLoadoutPanel(): LoadoutPanel {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'middle';
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  const mesh = new Mesh(new PlaneGeometry(0.82, 0.82 * (H / W)), new MeshBasicMaterial({ map: texture, transparent: true }));
  mesh.name = 'loadout-panel';

  const cells = layout();
  let selectedSlot: number | null = null;

  const redraw = (): void => {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(255,255,255,0.9)');
    bg.addColorStop(1, 'rgba(226,232,255,0.88)');
    roundRect(ctx, 10, 10, W - 20, H - 20, 36);
    ctx.fillStyle = bg;
    ctx.fill();
    roundRect(ctx, 10, 10, W - 20, H - 20, 36);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(185,140,255,0.7)';
    ctx.stroke();

    drawTabs(ctx, 'loadout');

    ctx.fillStyle = '#6a4fb0';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const instructionText = selectedSlot !== null
      ? 'Click another slot to swap weapons'
      : 'Click a slot to select, then another to swap';
    ctx.fillText(instructionText, 26, 88);
    ctx.fillText('Curve weapons (follow your swing)', 26, 544);
    ctx.textAlign = 'center';

    // Draw weapon slots
    for (const c of cells) {
      const a = c.action;
      if (a.kind === 'select') {
        const spot = a.spot;
        const weaponIdx = loadout.slots[spot];
        const arch = ARCHETYPES[weaponIdx];
        const isSelected = selectedSlot === spot;
        
        // Slot background
        roundRect(ctx, c.x, c.y, c.w, c.h, 14);
        if (isSelected) {
          // Glowing purple for selected slot
          ctx.fillStyle = 'rgba(185,140,255,0.5)';
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
        }
        ctx.fill();
        
        // Border
        roundRect(ctx, c.x, c.y, c.w, c.h, 14);
        ctx.lineWidth = isSelected ? 5 : 2;
        ctx.strokeStyle = isSelected ? '#b98cff' : 'rgba(120,90,180,0.35)';
        ctx.stroke();
        
        // Slot label
        ctx.textAlign = 'left';
        ctx.fillStyle = isSelected ? '#6a4fb0' : '#8a7bb0';
        ctx.font = '600 18px system-ui, sans-serif';
        ctx.fillText(SPOT_LABELS[spot], c.x + 16, c.y + 22);
        
        // Weapon name (large, centered)
        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected ? '#5a3fa0' : '#6a4fb0';
        ctx.font = isSelected ? '900 32px system-ui, sans-serif' : '800 28px system-ui, sans-serif';
        ctx.fillText(arch.name, c.x + c.w / 2, c.y + c.h / 2 + 4);
        
      } else if (a.kind === 'curve') {
        const arch = ARCHETYPES[a.t];
        const on = !!loadout.curve[a.t];
        roundRect(ctx, c.x, c.y, c.w, c.h, 12);
        ctx.fillStyle = on ? 'rgba(110,224,200,0.3)' : 'rgba(255,255,255,0.85)';
        ctx.fill();
        roundRect(ctx, c.x, c.y, c.w, c.h, 12);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(120,90,180,0.4)';
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#5a3fa0';
        ctx.font = '700 26px system-ui, sans-serif';
        ctx.fillText(arch.name, c.x + 18, c.y + c.h / 2);
        // Tick box on the right.
        const bs = 30, bx = c.x + c.w - bs - 16, by = c.y + (c.h - bs) / 2;
        roundRect(ctx, bx, by, bs, bs, 7);
        ctx.fillStyle = on ? '#3fd08a' : 'rgba(255,255,255,0.95)';
        ctx.fill();
        roundRect(ctx, bx, by, bs, bs, 7);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(90,63,160,0.5)';
        ctx.stroke();
        if (on) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(bx + 7, by + 16);
          ctx.lineTo(bx + 13, by + 22);
          ctx.lineTo(bx + 23, by + 8);
          ctx.stroke();
        }
        ctx.textAlign = 'center';
      } else if (a.kind === 'done') {
        roundRect(ctx, c.x, c.y, c.w, c.h, 16);
        const grad = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
        grad.addColorStop(0, '#7af0a0');
        grad.addColorStop(1, '#46c87a');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DONE', c.x + c.w / 2, c.y + c.h / 2 + 1);
      }
    }
    texture.needsUpdate = true;
  };

  const hitTest = (u: number, v: number): LoadoutAction | null => {
    const px = u * W;
    const py = (1 - v) * H;
    const tab = tabHit(px, py);
    if (tab) return { kind: 'tab', to: tab };
    for (const c of cells) {
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return c.action;
    }
    return null;
  };

  redraw();
  return {
    mesh,
    selectedSlot: null,
    redraw,
    hitTest
  };
}
