/**
 * Glassmorphic world-space HUD: a frosted, light-bordered panel above the arena
 * with gradient health bars, score, round timer and status messages. Rendered to
 * a high-resolution canvas for crisp text, with the translucent "frosted glass"
 * look composited in canvas (depth-correct real-glass refraction on a readable
 * HUD isn't worth the cost/legibility hit).
 */

import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Scene,
} from '@iwsdk/core';
import { ARENA_GAP } from '../config.js';
import type { MatchState } from '../combat/matchState.js';

const W = 1024;
const H = 460;

export interface Hud {
  update(state: MatchState, pHp: number, pMax: number, oHp: number, oMax: number): void;
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

export function createHud(scene: Scene): Hud {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;

  const panel = new Mesh(
    new PlaneGeometry(1.95, 0.88),
    new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  panel.position.set(0, 2.25, -ARENA_GAP * 0.5);
  panel.name = 'hud';
  scene.add(panel);

  const healthBar = (x: number, y: number, w: number, h: number, frac: number, c0: string, c1: string): void => {
    // Track.
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    // Fill.
    const fw = Math.max(h, w * Math.max(0, Math.min(1, frac)));
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    ctx.save();
    roundRect(ctx, x, y, fw, h, h / 2);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.shadowColor = c1;
    ctx.shadowBlur = 26;
    ctx.fillRect(x, y, fw, h);
    ctx.restore();
    // Neon outline.
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
  };

  const update: Hud['update'] = (state, pHp, pMax, oHp, oMax) => {
    ctx.clearRect(0, 0, W, H);

    // --- Frosted glass panel ---
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(28,34,66,0.46)');
    bg.addColorStop(1, 'rgba(8,10,24,0.62)');
    roundRect(ctx, 10, 10, W - 20, H - 20, 36);
    ctx.fillStyle = bg;
    ctx.shadowColor = 'rgba(46,230,255,0.35)';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Light border + top highlight.
    roundRect(ctx, 10, 10, W - 20, H - 20, 36);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, 28, 22, W - 56, 6, 3);
    ctx.fill();

    // --- Title ---
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(154,216,255,0.7)';
    ctx.fillText('G L A S S T O N', W / 2, 56);

    // --- Health rows ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 34px system-ui, sans-serif';

    ctx.fillStyle = '#2ee6ff';
    ctx.fillText('YOU', 48, 130);
    healthBar(170, 110, 690, 40, pHp / pMax, '#1aa0d8', '#7df3ff');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#dffaff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(Math.ceil(pHp)), 980, 130);

    ctx.textAlign = 'left';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = '#ff2eb0';
    ctx.fillText('FOE', 48, 196);
    healthBar(170, 176, 690, 40, oHp / oMax, '#c01a86', '#ff7fd0');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe1f3';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(Math.ceil(oHp)), 980, 196);

    // --- Round / score / timer ---
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      `ROUND ${state.round}     ${state.playerScore} : ${state.aiScore}     ${Math.ceil(state.roundTimer)}s`,
      W / 2,
      280,
    );

    // --- Status message ---
    if (state.message) {
      ctx.fillStyle = 'rgba(5,6,15,0.55)';
      roundRect(ctx, 10, 320, W - 20, 120, 30);
      ctx.fill();
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillStyle = '#ffd9a0';
      ctx.shadowColor = '#ffb347';
      ctx.shadowBlur = 28;
      ctx.fillText(state.message, W / 2, 384);
      ctx.shadowBlur = 0;
    }

    texture.needsUpdate = true;
  };

  return { update };
}
