/**
 * Shared "Cat | Loadout" tab header drawn at the top of both customize panels,
 * so they switch between the character customizer and the loadout editor.
 */

export type CustomizeTab = 'cat' | 'loadout';

interface TabCell {
  x: number;
  y: number;
  w: number;
  h: number;
  to: CustomizeTab;
  label: string;
}

export const TAB_CELLS: TabCell[] = [
  { x: 24, y: 22, w: 228, h: 48, to: 'cat', label: 'Cat' },
  { x: 260, y: 22, w: 228, h: 48, to: 'loadout', label: 'Loadout' },
];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawTabs(ctx: CanvasRenderingContext2D, active: CustomizeTab): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const cell of TAB_CELLS) {
    const on = cell.to === active;
    roundRect(ctx, cell.x, cell.y, cell.w, cell.h, 14);
    ctx.fillStyle = on ? '#b98cff' : 'rgba(255,255,255,0.85)';
    ctx.fill();
    roundRect(ctx, cell.x, cell.y, cell.w, cell.h, 14);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(120,90,180,0.5)';
    ctx.stroke();
    ctx.fillStyle = on ? '#ffffff' : '#6a4fb0';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(cell.label, cell.x + cell.w / 2, cell.y + cell.h / 2 + 1);
  }
}

/** Map a canvas pixel to a tab, or null. */
export function tabHit(px: number, py: number): CustomizeTab | null {
  for (const c of TAB_CELLS) {
    if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return c.to;
  }
  return null;
}
