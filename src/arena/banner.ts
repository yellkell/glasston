/**
 * The "Play BLASTO!" signage from the box art, recreated on a canvas texture and
 * hung high behind the opponent as arena branding: a teal→blue rainbow swoosh, a
 * row of scalloped purple clouds, bouncing ping-pong balls and the bubble-letter
 * logo. Canvas-drawn (like the HUD) so it's crisp and cheap, and kept floating
 * up out of the way so it frames the duel without crowding your real room.
 */

import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, type Scene } from '@iwsdk/core';
import { ARENA_GAP } from '../config.js';

const W = 1024;
const H = 512;

function bubbleText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
  ctx.font = `900 ${size}px system-ui, "Arial Rounded MT Bold", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // Purple outer outline, white inner outline, teal fill — the glassy bubble look.
  ctx.lineWidth = size * 0.26;
  ctx.strokeStyle = '#8a5cff';
  ctx.strokeText(text, x, y);
  ctx.lineWidth = size * 0.13;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, x, y);
  const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  grad.addColorStop(0, '#7af0ff');
  grad.addColorStop(1, '#3ec6e0');
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y);
}

export function createTitleBanner(scene: Scene): Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Rainbow swoosh across the top.
  ctx.save();
  ctx.translate(W / 2, 150);
  ctx.rotate(-0.14);
  const swoosh = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  swoosh.addColorStop(0, 'rgba(79,216,230,0.95)');
  swoosh.addColorStop(0.55, 'rgba(71,184,255,0.95)');
  swoosh.addColorStop(1, 'rgba(185,140,255,0.95)');
  ctx.fillStyle = swoosh;
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.62, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // A few bouncing ping-pong balls.
  ctx.fillStyle = '#fdfdff';
  for (const [bx, by, br] of [
    [250, 250, 22],
    [330, 200, 16],
    [690, 230, 20],
  ] as const) {
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Logo.
  bubbleText(ctx, 'Play', W / 2 - 250, 150, 92);
  bubbleText(ctx, 'BLASTO!', W / 2 + 70, 175, 150);

  // Scalloped purple cloud band along the bottom.
  ctx.fillStyle = '#a06ff0';
  ctx.fillRect(0, H - 96, W, 96);
  for (let x = 24; x < W; x += 64) {
    ctx.beginPath();
    ctx.arc(x, H - 96, 38, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Subtitle on the cloud band.
  ctx.font = '800 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef0ff';
  ctx.fillText('Have fun shooting friends with Ping-Pong Balls!', W / 2, H - 46);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;

  const banner = new Mesh(
    new PlaneGeometry(3.6, 1.8),
    new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.95 }),
  );
  banner.position.set(0, 4.3, -ARENA_GAP - 0.6);
  banner.name = 'title-banner';
  scene.add(banner);
  return banner;
}
