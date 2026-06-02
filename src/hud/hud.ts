/**
 * A simple world-space HUD panel (canvas texture on a plane) above the arena,
 * showing both health bars, the score, the round timer and status messages.
 * Functional for now; the glassmorphic styling pass is Phase 6.
 */

import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type Scene,
} from '@iwsdk/core';
import { ARENA_GAP } from '../config.js';
import type { MatchState } from '../combat/matchState.js';

const W = 512;
const H = 256;

export interface Hud {
  update(state: MatchState, pHp: number, pMax: number, oHp: number, oMax: number): void;
}

export function createHud(scene: Scene): Hud {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);

  const panel = new Mesh(
    new PlaneGeometry(1.7, 0.85),
    new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  panel.position.set(0, 2.2, -ARENA_GAP * 0.5);
  panel.name = 'hud';
  scene.add(panel);

  const bar = (x: number, y: number, w: number, frac: number, color: string): void => {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 22);
    ctx.shadowBlur = 0;
  };

  const update: Hud['update'] = (state, pHp, pMax, oHp, oMax) => {
    ctx.clearRect(0, 0, W, H);

    // Frosted backing.
    ctx.fillStyle = 'rgba(8,10,25,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(154,216,255,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, W - 12, H - 12);

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = '#2ee6ff';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', 28, 50);
    bar(110, 39, 360, pHp / pMax, '#2ee6ff');

    ctx.fillStyle = '#ff2eb0';
    ctx.fillText('FOE', 28, 96);
    bar(110, 85, 360, oHp / oMax, '#ff2eb0');

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(
      `ROUND ${state.round}    ${state.playerScore} : ${state.aiScore}    ${Math.ceil(state.roundTimer)}s`,
      W / 2,
      150,
    );

    if (state.message) {
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillStyle = '#ffd9a0';
      ctx.shadowColor = '#ffd9a0';
      ctx.shadowBlur = 16;
      ctx.fillText(state.message, W / 2, 205);
      ctx.shadowBlur = 0;
    }

    texture.needsUpdate = true;
  };

  return { update };
}
