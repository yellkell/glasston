/**
 * Player damage feedback: a soft red vignette that flashes at the edges of view
 * when you take a hit, then fades. Head-locked (parented to the head space) and
 * alpha-blended (not additive) so it tints the passthrough edges without the
 * dark-halo artifact, and never knocks you around — purely a visual "ouch".
 */

import { createSystem, CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { feedback } from '../fx/feedback.js';

export class PlayerFeedbackSystem extends createSystem({}) {
  private mat?: MeshBasicMaterial;

  init(): void {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.52);
    g.addColorStop(0, 'rgba(255,40,40,0)');
    g.addColorStop(1, 'rgba(220,20,30,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);

    const tex = new CanvasTexture(canvas);
    this.mat = new MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const plane = new Mesh(new PlaneGeometry(2.6, 2.0), this.mat);
    plane.position.set(0, 0, -0.6); // just in front of the eyes
    plane.renderOrder = 999;
    plane.name = 'player-hit-vignette';

    const head = this.playerHeadEntity?.object3D;
    if (head) head.add(plane);
    else this.scene.add(plane);
  }

  update(delta: number): void {
    feedback.playerHitFlash = Math.max(0, feedback.playerHitFlash - delta * 2.2);
    if (this.mat) this.mat.opacity = feedback.playerHitFlash * 0.55;
  }
}
