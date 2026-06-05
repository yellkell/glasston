/**
 * The character customizer panel: rows of fur swatches, accent swatches and
 * pattern buttons, plus DONE. One canvas-textured plane; clicks are resolved by
 * the raycast hit's UV (so a single mesh has many buttons). Reads/writes the
 * shared `playerSkin`.
 */

import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { ACCENT_COLORS, FUR_COLORS, PATTERNS, playerSkin } from './skin.js';

export type CustomizeAction =
  | { kind: 'fur'; i: number }
  | { kind: 'accent'; i: number }
  | { kind: 'pattern'; i: number }
  | { kind: 'done' };

interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  action: CustomizeAction;
}

const W = 512;
const H = 640;

export interface Customizer {
  mesh: Mesh;
  redraw: () => void;
  hitTest: (u: number, v: number) => CustomizeAction | null;
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

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function layout(): Cell[] {
  const cells: Cell[] = [];
  // Fur swatches — one row of 8.
  const fW = 46, fGap = (W - 48 - 8 * fW) / 7, fY = 116;
  FUR_COLORS.forEach((_, i) => cells.push({ x: 24 + i * (fW + fGap), y: fY, w: fW, h: 46, action: { kind: 'fur', i } }));
  // Accent swatches — one row of 6.
  const aW = 56, aGap = 16, aStart = (W - 6 * aW - 5 * aGap) / 2, aY = 230;
  ACCENT_COLORS.forEach((_, i) => cells.push({ x: aStart + i * (aW + aGap), y: aY, w: aW, h: 52, action: { kind: 'accent', i } }));
  // Pattern buttons — one row of 4.
  const pW = 108, pGap = 12, pStart = (W - 4 * pW - 3 * pGap) / 2, pY = 352;
  PATTERNS.forEach((_, i) => cells.push({ x: pStart + i * (pW + pGap), y: pY, w: pW, h: 64, action: { kind: 'pattern', i } }));
  // Done.
  cells.push({ x: 126, y: 486, w: 260, h: 92, action: { kind: 'done' } });
  return cells;
}

export function createCustomizer(): Customizer {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  const mesh = new Mesh(new PlaneGeometry(0.82, 1.02), new MeshBasicMaterial({ map: texture, transparent: true }));
  mesh.name = 'customizer';

  const cells = layout();

  const redraw = (): void => {
    ctx.clearRect(0, 0, W, H);
    // Panel.
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

    ctx.fillStyle = '#6a4fb0';
    ctx.font = '800 40px system-ui, sans-serif';
    ctx.fillText('CUSTOMISE', W / 2, 44);
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Fur', 26, 92);
    ctx.fillText('Accent', 26, 206);
    ctx.fillText('Pattern', 26, 328);
    ctx.textAlign = 'center';

    for (const c of cells) {
      const a = c.action;
      if (a.kind === 'fur' || a.kind === 'accent') {
        const colour = a.kind === 'fur' ? FUR_COLORS[a.i] : ACCENT_COLORS[a.i];
        const selected = a.kind === 'fur' ? playerSkin.fur === colour : playerSkin.accent === colour;
        roundRect(ctx, c.x, c.y, c.w, c.h, 12);
        ctx.fillStyle = hex(colour);
        ctx.fill();
        roundRect(ctx, c.x, c.y, c.w, c.h, 12);
        ctx.lineWidth = selected ? 6 : 2;
        ctx.strokeStyle = selected ? '#3ec6e0' : 'rgba(120,90,180,0.4)';
        ctx.stroke();
      } else if (a.kind === 'pattern') {
        const selected = playerSkin.pattern === PATTERNS[a.i];
        roundRect(ctx, c.x, c.y, c.w, c.h, 16);
        ctx.fillStyle = selected ? '#cdeffd' : 'rgba(255,255,255,0.9)';
        ctx.fill();
        roundRect(ctx, c.x, c.y, c.w, c.h, 16);
        ctx.lineWidth = selected ? 5 : 2;
        ctx.strokeStyle = selected ? '#3ec6e0' : 'rgba(120,90,180,0.4)';
        ctx.stroke();
        ctx.fillStyle = '#6a4fb0';
        ctx.font = '700 24px system-ui, sans-serif';
        const label = PATTERNS[a.i][0].toUpperCase() + PATTERNS[a.i].slice(1);
        ctx.fillText(label, c.x + c.w / 2, c.y + c.h / 2 + 2);
      } else {
        // Done.
        roundRect(ctx, c.x, c.y, c.w, c.h, 46);
        const grad = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
        grad.addColorStop(0, '#7af0a0');
        grad.addColorStop(1, '#46c87a');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px system-ui, sans-serif';
        ctx.fillText('DONE', c.x + c.w / 2, c.y + c.h / 2 + 2);
      }
    }
    texture.needsUpdate = true;
  };

  const hitTest = (u: number, v: number): CustomizeAction | null => {
    const px = u * W;
    const py = (1 - v) * H; // uv origin is bottom-left
    for (const c of cells) {
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return c.action;
    }
    return null;
  };

  redraw();
  return { mesh, redraw, hitTest };
}
