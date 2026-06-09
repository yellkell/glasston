/**
 * Kawaii cat paw for the player's hands. Attaches to controllers and follows
 * their movement, with toe beans and a soft, rounded shape. Inspired by Bongo
 * Cat's adorable paws.
 */

import {
  Group,
  Mesh,
  SphereGeometry,
  type Object3D,
} from '@iwsdk/core';
import { makeGlass } from '../materials/glass.js';
import type { Skin } from '../menu/skin.js';

/**
 * Build a cat paw that attaches to a controller. The paw is oriented so that
 * when the controller points forward (-Z), the paw palm faces down and the
 * fingers point forward.
 */
export function buildCatPaw(skin: Skin): Group {
  const group = new Group();
  group.name = 'cat-paw';

  const furColor = skin.fur;
  const accentColor = skin.accent;

  // Materials
  const fur = () => makeGlass({ color: furColor, roughness: 0.5, emissiveIntensity: 0.04 });
  const bean = () => makeGlass({ color: accentColor, roughness: 0.4, emissive: accentColor, emissiveIntensity: 0.2 });

  // Main paw pad: a softly squashed sphere.
  const palmW = 0.06;
  const palmH = 0.04;
  const palmD = 0.08;
  const palmRound = new Mesh(new SphereGeometry(palmW * 0.7, 16, 12), fur());
  palmRound.scale.set(1, 0.6, 1.2);
  group.add(palmRound);

  // Large center pad (main toe bean)
  const centerPad = new Mesh(new SphereGeometry(0.022, 14, 12), bean());
  centerPad.scale.set(1, 0.7, 1.3);
  centerPad.position.set(0, -palmH * 0.6, palmD * 0.3);
  group.add(centerPad);

  // Four toe beans arranged in an arc
  const toePositions = [
    [-0.022, -palmH * 0.5, palmD * 0.5], // left outer
    [-0.010, -palmH * 0.5, palmD * 0.55], // left inner
    [0.010, -palmH * 0.5, palmD * 0.55], // right inner
    [0.022, -palmH * 0.5, palmD * 0.5], // right outer
  ];

  for (const pos of toePositions) {
    const toe = new Mesh(new SphereGeometry(0.012, 12, 10), bean());
    toe.scale.set(0.9, 0.7, 1.1);
    toe.position.set(pos[0], pos[1], pos[2]);
    group.add(toe);
  }

  // Rotate the paw so it's oriented correctly when attached to controller
  // Controller forward is -Z, we want paw palm facing down (-Y) and fingers forward
  group.rotation.x = Math.PI / 2;
  group.userData.baseRotX = group.rotation.x; // grip-curl animates relative to this

  return group;
}

/**
 * Animate a paw "tap" or "boop" - extends forward slightly then returns.
 * Used when the player presses trigger in the customization menu.
 */
export function playPawTapAnimation(paw: Object3D, duration = 0.15): void {
  const startZ = paw.position.z;
  const extendZ = startZ - 0.04; // extend 4cm forward
  const startTime = performance.now();

  const animate = (): void => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);

    if (t < 0.5) {
      // Extend
      const easeOut = 1 - Math.pow(1 - t * 2, 2);
      paw.position.z = startZ + (extendZ - startZ) * easeOut;
    } else {
      // Return
      const easeIn = Math.pow((t - 0.5) * 2, 2);
      paw.position.z = extendZ + (startZ - extendZ) * easeIn;
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      paw.position.z = startZ;
    }
  };

  animate();
}

/**
 * Animate paw curl (when gripping a weapon). Scales the paw slightly and
 * rotates fingers inward.
 */
export function setPawGrip(paw: Object3D, gripping: boolean, duration = 0.1): void {
  // Curl relative to the paw's authored orientation (π/2 toward the controller)
  // — an absolute 0.15 target used to fold the whole paw flat.
  const base = typeof paw.userData.baseRotX === 'number' ? (paw.userData.baseRotX as number) : paw.rotation.x;
  const targetScale = gripping ? 0.9 : 1.0;
  const targetRotX = base + (gripping ? 0.15 : 0);
  const startScale = paw.scale.x;
  const startRotX = paw.rotation.x;
  const startTime = performance.now();

  const animate = (): void => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease out cubic

    paw.scale.setScalar(startScale + (targetScale - startScale) * ease);
    paw.rotation.x = startRotX + (targetRotX - startRotX) * ease;

    if (t < 1) {
      requestAnimationFrame(animate);
    }
  };

  animate();
}

// Made with Bob
