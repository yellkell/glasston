/**
 * Preset-based cat customization panel: a grid of pre-built cat characters
 * (Bongo Cat style) with a little face drawn in each card so you can see the
 * look at a glance. Same canvas-panel pattern as the loadout editor — one
 * rounded card, the shared Cat|Loadout tab header, and a DONE button, with
 * clicks resolved from the raycast hit's UV.
 */

import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { drawTabs, tabHit, type CustomizeTab } from './tabs.js';
import { CAT_PRESETS, type CatPreset } from './catPresets.js';
import type { Skin } from './skin.js';

const W = 512;
const H = 720;

export type PresetAction =
  | { kind: 'select'; presetId: string }
  | { kind: 'tab'; to: CustomizeTab }
  | { kind: 'done' };

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  action: PresetAction;
}

export interface PresetPanel {
  mesh: Mesh;
  selectedId: string;
  redraw: () => void;
  hitTest: (u: number, v: number) => PresetAction | null;
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

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/** A tiny kawaii cat face: head, ears, eyes + sparkles, nose and blush. */
function drawMiniCat(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, skin: Skin): void {
  const fur = hex(skin.fur);
  const accent = hex(skin.accent);

  // Ears (with accent lining).
  for (const side of [-1, 1] as const) {
    const ex = cx + side * r * 0.62;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.32, cy - r * 0.55);
    ctx.lineTo(ex, cy - r * 1.25);
    ctx.lineTo(ex + r * 0.32, cy - r * 0.55);
    ctx.closePath();
    ctx.fillStyle = fur;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.16, cy - r * 0.6);
    ctx.lineTo(ex, cy - r * 1.05);
    ctx.lineTo(ex + r * 0.16, cy - r * 0.6);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
  }

  // Head.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(106,79,176,0.25)';
  ctx.stroke();

  // Pattern hints on the head.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (skin.pattern === 'stripes') {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 4;
    for (const off of [-0.45, 0, 0.45]) {
      ctx.beginPath();
      ctx.moveTo(cx + off * r - r * 0.18, cy - r);
      ctx.lineTo(cx + off * r + r * 0.18, cy - r * 0.45);
      ctx.stroke();
    }
  } else if (skin.pattern === 'spots') {
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (const [dx, dy, sr] of [[-0.55, -0.4, 0.22], [0.5, -0.55, 0.18], [0.62, 0.3, 0.16]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx * r, cy + dy * r, sr * r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (skin.pattern === 'tuxedo') {
    ctx.fillStyle = '#fff6e8';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.95, r * 0.75, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Eyes + sparkles.
  ctx.fillStyle = '#2a2336';
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.38, cy - r * 0.08, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.arc(cx + side * r * 0.43, cy - r * 0.15, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blush.
  ctx.fillStyle = 'rgba(255,143,207,0.55)';
  for (const side of [-1, 1] as const) {
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.62, cy + r * 0.22, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nose + :3 mouth.
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.18, r * 0.09, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2336';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx - r * 0.12, cy + r * 0.3, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.arc(cx + r * 0.12, cy + r * 0.3, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function layout(): Cell[] {
  const cells: Cell[] = [];
  const cols = 2;
  const cellW = 220;
  const cellH = 118;
  const startX = 24;
  const startY = 104;
  const gapX = 24;
  const gapY = 14;
  for (let i = 0; i < CAT_PRESETS.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cells.push({
      x: startX + col * (cellW + gapX),
      y: startY + row * (cellH + gapY),
      w: cellW,
      h: cellH,
      action: { kind: 'select', presetId: CAT_PRESETS[i].id },
    });
  }
  cells.push({ x: 126, y: 648, w: 260, h: 44, action: { kind: 'done' } });
  return cells;
}

function drawPresetCard(
  ctx: CanvasRenderingContext2D,
  c: Cell,
  preset: CatPreset,
  selected: boolean,
): void {
  roundRect(ctx, c.x, c.y, c.w, c.h, 14);
  ctx.fillStyle = selected ? 'rgba(185,140,255,0.45)' : 'rgba(255,255,255,0.9)';
  ctx.fill();
  roundRect(ctx, c.x, c.y, c.w, c.h, 14);
  ctx.lineWidth = selected ? 5 : 2;
  ctx.strokeStyle = selected ? '#8a5cff' : 'rgba(120,90,180,0.3)';
  ctx.stroke();

  // Mini cat face on the left, text on the right.
  drawMiniCat(ctx, c.x + 44, c.y + c.h / 2 + 8, 26, preset.skin);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#6a4fb0';
  ctx.font = '800 21px system-ui, sans-serif';
  ctx.fillText(preset.name, c.x + 86, c.y + 26);
  ctx.fillStyle = 'rgba(106,79,176,0.75)';
  ctx.font = '500 14px system-ui, sans-serif';
  ctx.fillText(preset.description, c.x + 86, c.y + 56, c.w - 96);
}

export function createPresetPanel(initialSelectedId: string): PresetPanel {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  const mesh = new Mesh(
    new PlaneGeometry(0.82, 0.82 * (H / W)),
    new MeshBasicMaterial({ map: texture, transparent: true }),
  );
  mesh.name = 'preset-panel';

  const cells = layout();

  const panel: PresetPanel = {
    mesh,
    selectedId: initialSelectedId,
    redraw: (): void => {
      ctx.clearRect(0, 0, W, H);

      // Rounded frosted card (matches the loadout panel).
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

      drawTabs(ctx, 'cat');

      ctx.fillStyle = '#6a4fb0';
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Choose your cat', 26, 90);

      for (const c of cells) {
        if (c.action.kind === 'select') {
          const preset = CAT_PRESETS.find((p) => p.id === (c.action as { presetId: string }).presetId)!;
          drawPresetCard(ctx, c, preset, preset.id === panel.selectedId);
        } else if (c.action.kind === 'done') {
          roundRect(ctx, c.x, c.y, c.w, c.h, 16);
          const grad = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
          grad.addColorStop(0, '#7af0a0');
          grad.addColorStop(1, '#46c87a');
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 28px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('DONE', c.x + c.w / 2, c.y + c.h / 2 + 1);
        }
      }
      texture.needsUpdate = true;
    },
    hitTest: (u: number, v: number): PresetAction | null => {
      const px = u * W;
      const py = (1 - v) * H;
      const tab = tabHit(px, py);
      if (tab) return { kind: 'tab', to: tab };
      for (const c of cells) {
        if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return c.action;
      }
      return null;
    },
  };

  panel.redraw();
  return panel;
}
