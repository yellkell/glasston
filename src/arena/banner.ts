/**
 * The "Play BLASTO!" signage, recreated from the box art on a canvas texture and
 * hung high behind the opponent as arena branding: a sky-blue rounded poster, a
 * striped rainbow sweeping up from the left, "Play" in purple bubble letters
 * tilted along the rainbow, "BLASTO!" big and pink at the top right, bouncing
 * ping-pong balls, a scalloped purple cloud band, and the yellow tagline.
 * Canvas-drawn (like the HUD) so it's crisp and cheap, floating up out of the
 * way so it frames the duel without crowding your real room.
 */

import { CanvasTexture, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, type Scene } from '@iwsdk/core';

const W = 1024;
const H = 512;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Bubble lettering: dark outer outline, white inner outline, glossy fill. */
function bubbleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  rotation: number,
  fillTop: string,
  fillBottom: string,
  outline: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.font = `900 ${size}px system-ui, "Arial Rounded MT Bold", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.26;
  ctx.strokeStyle = outline;
  ctx.strokeText(text, 0, 0);
  ctx.lineWidth = size * 0.13;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, 0, 0);
  const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  grad.addColorStop(0, fillTop);
  grad.addColorStop(1, fillBottom);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function createTitleBanner(scene: Scene): Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Sky-blue rounded poster backdrop (everything below is clipped to it).
  roundRectPath(ctx, 0, 0, W, H, 42);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#aee6ff');
  sky.addColorStop(0.6, '#74c8f2');
  sky.addColorStop(1, '#5db4e8');
  ctx.fillStyle = sky;
  ctx.fill();
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 42);
  ctx.clip();

  // Striped rainbow sweeping up from the lower left (box-art style): four
  // concentric bands around a centre below the canvas.
  const rcx = 40;
  const rcy = H + 560;
  const bands: Array<[number, string]> = [
    [86, '#ff9ad6'], // pink
    [86, '#b98cff'], // purple
    [86, '#6fd6ff'], // light blue
    [86, '#4fd8c6'], // teal
  ];
  let radius = 920;
  for (const [width, color] of bands) {
    ctx.beginPath();
    ctx.arc(rcx, rcy, radius, -Math.PI * 0.62, -Math.PI * 0.18);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
    radius -= width;
  }

  // Bouncing ping-pong balls with a soft shadow each.
  for (const [bx, by, br] of [
    [150, 110, 15],
    [470, 305, 21],
    [560, 95, 13],
    [845, 300, 17],
    [950, 80, 12],
  ] as const) {
    ctx.beginPath();
    ctx.arc(bx + br * 0.18, by + br * 0.22, br, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,80,140,0.22)';
    ctx.fill();
    const ball = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.2, bx, by, br);
    ball.addColorStop(0, '#ffffff');
    ball.addColorStop(1, '#dfeaf2');
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = ball;
    ctx.fill();
  }

  // Logo: "Play" rides the rainbow at the left, "BLASTO!" big at the top right.
  bubbleText(ctx, 'Play', 205, 252, 104, -0.2, '#b98cff', '#8a5cff', '#5a3fa0');
  bubbleText(ctx, 'BLASTO!', 645, 132, 138, -0.05, '#ff8fb0', '#ff4f7e', '#d6275f');

  // Scalloped purple cloud band along the bottom.
  ctx.fillStyle = '#a06ff0';
  ctx.fillRect(0, H - 96, W, 96);
  for (let x = 24; x < W; x += 64) {
    ctx.beginPath();
    ctx.arc(x, H - 96, 38, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Yellow tagline on the cloud band (box-art lettering).
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(90,63,160,0.85)';
  ctx.strokeText('Have fun shooting friends with Ping-Pong Balls!', W / 2, H - 46);
  ctx.fillStyle = '#ffe24a';
  ctx.fillText('Have fun shooting friends with Ping-Pong Balls!', W / 2, H - 46);

  ctx.restore();

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;

  const banner = new Mesh(
    new PlaneGeometry(2.2, 1.1),
    new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.96 }),
  );
  // Floats high behind the opponent, tilted gently down toward the player.
  // Clear of the lobby panels (y≈1.45, z≈-1.3); MenuSystem hides it during a match.
  banner.position.set(0, 2.6, -2.8);
  banner.rotation.x = 0.12;
  banner.name = 'title-banner';
  banner.renderOrder = -1; // render behind other UI elements
  scene.add(banner);
  return banner;
}
