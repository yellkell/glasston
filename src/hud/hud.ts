/**
 * Playful world-space HUD: a soft frosted-pastel panel above the arena with
 * gradient health bars, score, round timer and status messages. Rendered to a
 * high-resolution canvas for crisp text. The light, friendly palette (blue =
 * you, pink = the cat foe) matches the rest of Blasto and stays legible over a
 * busy passthrough background.
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
import { getHapticsDebug } from '../input/haptics.js';

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

    // --- Frosted pastel panel ---
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(255,255,255,0.66)');
    bg.addColorStop(1, 'rgba(232,224,255,0.62)');
    roundRect(ctx, 10, 10, W - 20, H - 20, 36);
    ctx.fillStyle = bg;
    ctx.shadowColor = 'rgba(185,140,255,0.45)';
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Light border + top highlight.
    roundRect(ctx, 10, 10, W - 20, H - 20, 36);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    roundRect(ctx, 28, 22, W - 56, 6, 3);
    ctx.fill();

    // --- Title ---
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '700 32px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(150,110,230,0.9)';
    ctx.fillText('B L A S T O', W / 2, 56);

    // Haptics diagnostic (temporary): per-hand actuator + last hand buzzed.
    ctx.font = '600 22px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(120,90,180,0.85)';
    ctx.fillText(getHapticsDebug(), W / 2, 92);

    // --- Health rows ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 34px system-ui, sans-serif';

    ctx.fillStyle = '#3aa0e8';
    ctx.fillText('YOU', 48, 130);
    healthBar(170, 110, 690, 40, pHp / pMax, '#6ec6ff', '#bfe6ff');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2b6fa8';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(Math.ceil(pHp)), 980, 130);

    ctx.textAlign = 'left';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = '#e85fae';
    ctx.fillText('CAT', 48, 196);
    healthBar(170, 176, 690, 40, oHp / oMax, '#ff9ad6', '#ffd0ec');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b03a7e';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(String(Math.ceil(oHp)), 980, 196);

    // --- Round / score / timer ---
    ctx.textAlign = 'center';
    ctx.font = 'bold 38px system-ui, sans-serif';
    ctx.fillStyle = '#6a4fb0';
    ctx.fillText(
      `ROUND ${state.round}     ${state.playerScore} : ${state.aiScore}     ${Math.ceil(state.roundTimer)}s`,
      W / 2,
      280,
    );

    // --- Status message ---
    if (state.message) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(ctx, 10, 320, W - 20, 120, 30);
      ctx.fill();
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillStyle = '#9b6cff';
      ctx.shadowColor = 'rgba(255,154,214,0.9)';
      ctx.shadowBlur = 28;
      ctx.fillText(state.message, W / 2, 384);
      ctx.shadowBlur = 0;
    }

    texture.needsUpdate = true;
  };

  return { update };
}
