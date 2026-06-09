/**
 * Preset-based cat customization panel.
 * Shows a grid of pre-built cat character presets that users can select.
 * Much simpler and more intuitive than individual color pickers.
 */

import { CanvasTexture, LinearFilter } from '@iwsdk/core';
import { drawTabs } from './tabs.js';
import { CAT_PRESETS, type CatPreset } from './catPresets.js';

const W = 512;
const H = 512;

interface PresetCell {
  x: number;
  y: number;
  w: number;
  h: number;
  preset: CatPreset;
}

export interface PresetPanel {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  cells: PresetCell[];
  selectedId: string;
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

/**
 * Draw a preset card with name and description.
 */
function drawPresetCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  preset: CatPreset,
  selected: boolean,
): void {
  // Card background
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = selected ? '#b98cff' : 'rgba(255,255,255,0.9)';
  ctx.fill();
  
  // Border
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? '#8a5cff' : 'rgba(120,90,180,0.3)';
  ctx.stroke();

  // Preset name
  ctx.fillStyle = selected ? '#ffffff' : '#6a4fb0';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(preset.name, x + w / 2, y + 12);

  // Description
  ctx.fillStyle = selected ? 'rgba(255,255,255,0.9)' : 'rgba(106,79,176,0.7)';
  ctx.font = '400 13px system-ui, sans-serif';
  ctx.fillText(preset.description, x + w / 2, y + 36);

  // Color preview circles
  const furColor = preset.skin.fur;
  const accentColor = preset.skin.accent;
  
  // Import colors from skin.ts
  const FUR_COLORS = [
    0xfafdff, 0xffe6c8, 0xffd1a8, 0xe8c49a, 0xc9d3e0, 0x9aa3b5, 0x6b6f7d, 0x3c3f4a,
    0xc7f0d8, 0xbfe4ff, 0x9bb8ff, 0xd9c2ff, 0xffc6e6, 0xffb0b0, 0xb8e6c0, 0xffe98c,
  ];
  const ACCENT_COLORS = [
    0xff8fcf, 0xff5fa8, 0xb98cff, 0x8a5cff, 0x47b8ff, 0x2ee6c0, 0x6ee0a0, 0xffd23f, 0xffa14a, 0xff7a7a,
  ];

  const furHex = '#' + FUR_COLORS[furColor].toString(16).padStart(6, '0');
  const accentHex = '#' + ACCENT_COLORS[accentColor].toString(16).padStart(6, '0');

  // Draw color circles
  const cy = y + h - 24;
  ctx.beginPath();
  ctx.arc(x + w / 2 - 16, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = furHex;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + w / 2 + 16, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = accentHex;
  ctx.fill();
  ctx.stroke();
}

export function createPresetPanel(): PresetPanel {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Build preset cells in a 2x4 grid
  const cells: PresetCell[] = [];
  const cols = 2;
  const rows = 4;
  const cellW = 220;
  const cellH = 100;
  const startX = 36;
  const startY = 90;
  const gapX = 20;
  const gapY = 16;

  for (let i = 0; i < CAT_PRESETS.length && i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cells.push({
      x: startX + col * (cellW + gapX),
      y: startY + row * (cellH + gapY),
      w: cellW,
      h: cellH,
      preset: CAT_PRESETS[i],
    });
  }

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;

  return {
    canvas,
    texture,
    cells,
    selectedId: CAT_PRESETS[0].id, // Default to Bongo Cat
  };
}

export function redrawPresetPanel(panel: PresetPanel): void {
  const ctx = panel.canvas.getContext('2d')!;
  
  // Clear
  ctx.clearRect(0, 0, W, H);
  
  // Background
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, 0, W, H);
  
  // Tabs
  drawTabs(ctx, 'cat');
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Choose Your Cat', 36, 78);
  
  // Draw preset cards
  for (const cell of panel.cells) {
    drawPresetCard(
      ctx,
      cell.x,
      cell.y,
      cell.w,
      cell.h,
      cell.preset,
      cell.preset.id === panel.selectedId,
    );
  }
  
  panel.texture.needsUpdate = true;
}

export type PresetAction = { kind: 'select'; presetId: string };

export function presetHit(panel: PresetPanel, px: number, py: number): PresetAction | null {
  for (const cell of panel.cells) {
    if (px >= cell.x && px <= cell.x + cell.w && py >= cell.y && py <= cell.y + cell.h) {
      return { kind: 'select', presetId: cell.preset.id };
    }
  }
  return null;
}

// Made with Bob
