/**
 * Bongo Cat-style animations for the preview cat in the customization menu.
 * Includes idle animations (breathing, blinking, ear twitches) and reactive
 * animations (paw tracking, look-at, tap responses).
 */

import { Group, Object3D, Vector3 } from '@iwsdk/core';

const _target = new Vector3();
const _current = new Vector3();

/**
 * Animation state for a preview cat. Tracks timers and targets for smooth
 * interpolated animations.
 */
export interface CatAnimationState {
  // Idle animation timers
  breathePhase: number;
  blinkTimer: number;
  blinkDuration: number;
  isBlinking: boolean;
  earTwitchTimer: number;
  
  // Reactive animation targets
  leftPawTarget: Vector3;
  rightPawTarget: Vector3;
  lookAtTarget: Vector3 | null;
  
  // Animation speeds
  pawFollowSpeed: number;
  lookSpeed: number;
}

export function createCatAnimationState(): CatAnimationState {
  return {
    breathePhase: 0,
    blinkTimer: 3 + Math.random() * 2,
    blinkDuration: 0,
    isBlinking: false,
    earTwitchTimer: 4 + Math.random() * 3,
    leftPawTarget: new Vector3(0, 0, 0),
    rightPawTarget: new Vector3(0, 0, 0),
    lookAtTarget: null,
    pawFollowSpeed: 8,
    lookSpeed: 3,
  };
}

/**
 * Update idle animations: breathing, blinking, ear twitches.
 */
export function updateIdleAnimations(cat: Group, state: CatAnimationState, delta: number): void {
  const body = cat.children.find(c => c.name === 'body');
  const leftEar = cat.children.find(c => c.name === 'left-ear');
  const rightEar = cat.children.find(c => c.name === 'right-ear');

  // Breathing animation: a gentle pulse MULTIPLIED onto the model's base scale
  // (buildCat squashes the body to an egg shape — overwriting scale.y flattened it).
  state.breathePhase += delta * 1.5;
  const breathe = 1 + Math.sin(state.breathePhase) * 0.015;
  if (body) {
    rememberBaseScale(body);
    body.scale.y = (body.userData.baseScaleY as number) * breathe;
  }

  // Blinking animation
  state.blinkTimer -= delta;
  if (state.blinkTimer <= 0 && !state.isBlinking) {
    // Start blink
    state.isBlinking = true;
    state.blinkDuration = 0.15;
    state.blinkTimer = 3 + Math.random() * 2; // next blink in 3-5 seconds
  }

  if (state.isBlinking) {
    state.blinkDuration -= delta;
    // Find eyes and scale them vertically for blink effect
    const eyes = cat.children.filter(c => c.name && c.name.includes('eye'));
    const blinkProgress = Math.max(0, state.blinkDuration / 0.15);
    const eyeScaleY = blinkProgress < 0.5 ? blinkProgress * 2 : (1 - blinkProgress) * 2;
    for (const eye of eyes) {
      rememberBaseScale(eye);
      eye.scale.y = (eye.userData.baseScaleY as number) * (0.2 + eyeScaleY * 0.8); // close to 20% height
    }
    if (state.blinkDuration <= 0) {
      state.isBlinking = false;
      // Reset eyes to their modelled scale
      for (const eye of eyes) {
        eye.scale.y = eye.userData.baseScaleY as number;
      }
    }
  }

  // Ear twitch animation
  state.earTwitchTimer -= delta;
  if (state.earTwitchTimer <= 0) {
    state.earTwitchTimer = 4 + Math.random() * 3;
    // Twitch one random ear
    const ear = Math.random() < 0.5 ? leftEar : rightEar;
    if (ear) {
      animateEarTwitch(ear);
    }
  }
}

/** Stash an object's authored scale.y the first time we animate it. */
function rememberBaseScale(o: Object3D): void {
  if (typeof o.userData.baseScaleY !== 'number') o.userData.baseScaleY = o.scale.y;
}

/**
 * Animate an ear twitch (quick rotation and back).
 */
function animateEarTwitch(ear: Object3D): void {
  const startRotZ = ear.rotation.z;
  const twitchAmount = (Math.random() - 0.5) * 0.3;
  const duration = 0.2;
  const startTime = performance.now();

  const animate = (): void => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);

    if (t < 0.5) {
      // Twitch
      const ease = Math.sin(t * 2 * Math.PI);
      ear.rotation.z = startRotZ + twitchAmount * ease;
    } else {
      // Return
      const ease = Math.sin((t - 0.5) * 2 * Math.PI);
      ear.rotation.z = startRotZ + twitchAmount * ease * 0.5;
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      ear.rotation.z = startRotZ;
    }
  };

  animate();
}

/**
 * Update paw positions to follow controller targets (Bongo Cat style).
 */
export function updatePawTracking(
  cat: Group,
  state: CatAnimationState,
  leftController: Vector3 | null,
  rightController: Vector3 | null,
  delta: number
): void {
  const leftPaw = cat.children.find(c => c.name === 'left-paw');
  const rightPaw = cat.children.find(c => c.name === 'right-paw');

  // Convert world-space controller positions into the cat's LOCAL space with
  // worldToLocal — a plain subtraction ignored the preview holder's spin and
  // the cat's scale, so the paws drifted as the preview rotated.
  if (leftController && leftPaw) {
    const localPos = cat.worldToLocal(leftController.clone());
    localPos.x = Math.max(-0.3, Math.min(0.3, localPos.x));
    localPos.y = Math.max(-0.3, Math.min(0.2, localPos.y));
    localPos.z = Math.max(0.2, Math.min(0.5, localPos.z));
    state.leftPawTarget.copy(localPos);
  }

  if (rightController && rightPaw) {
    const localPos = cat.worldToLocal(rightController.clone());
    localPos.x = Math.max(-0.3, Math.min(0.3, localPos.x));
    localPos.y = Math.max(-0.3, Math.min(0.2, localPos.y));
    localPos.z = Math.max(0.2, Math.min(0.5, localPos.z));
    state.rightPawTarget.copy(localPos);
  }

  // Smoothly move paws toward targets
  const speed = state.pawFollowSpeed * delta;

  if (leftPaw) {
    _current.copy(leftPaw.position);
    _target.copy(state.leftPawTarget);
    _current.lerp(_target, Math.min(speed, 1));
    leftPaw.position.copy(_current);
  }

  if (rightPaw) {
    _current.copy(rightPaw.position);
    _target.copy(state.rightPawTarget);
    _current.lerp(_target, Math.min(speed, 1));
    rightPaw.position.copy(_current);
  }
}

/**
 * Make the cat look at a target position (controller ray intersection).
 */
export function updateLookAt(cat: Group, state: CatAnimationState, target: Vector3 | null, delta: number): void {
  const head = cat.children.find(c => c.name === 'head');
  if (!head) return;

  state.lookAtTarget = target;

  if (target) {
    // Smoothly rotate head to look at target (converted into cat-local space —
    // the head's position is local, so mixing in a world-space target skewed it).
    const localTarget = cat.worldToLocal(target.clone());
    const direction = new Vector3().subVectors(localTarget, head.position).normalize();
    const targetRotY = Math.atan2(direction.x, direction.z);
    const targetRotX = Math.asin(-direction.y);

    // Clamp rotation to reasonable limits
    const clampedRotY = Math.max(-0.5, Math.min(0.5, targetRotY));
    const clampedRotX = Math.max(-0.3, Math.min(0.3, targetRotX));

    // Smooth interpolation
    const speed = state.lookSpeed * delta;
    head.rotation.y += (clampedRotY - head.rotation.y) * speed;
    head.rotation.x += (clampedRotX - head.rotation.x) * speed;
  } else {
    // Return to neutral position
    const speed = state.lookSpeed * delta;
    head.rotation.y += (0 - head.rotation.y) * speed;
    head.rotation.x += (0 - head.rotation.x) * speed;
  }
}

/**
 * Play an excited bounce animation (when selecting something).
 */
export function playExcitedBounce(cat: Group): void {
  const startY = cat.position.y;
  const base = cat.scale.x; // respect the preview's 1.3x base scale
  const bounceHeight = 0.08;
  const duration = 0.4;
  const startTime = performance.now();

  const animate = (): void => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);

    // Bounce curve (parabola)
    const bounce = Math.sin(t * Math.PI) * bounceHeight;
    cat.position.y = startY + bounce;

    // Slight squash and stretch around the base scale (resetting to 1 used to
    // shrink the preview cat after its first bounce).
    const squash = 1 + Math.sin(t * Math.PI * 2) * 0.05;
    cat.scale.y = base * squash;
    cat.scale.x = base * (2 - squash);
    cat.scale.z = base * (2 - squash);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      cat.position.y = startY;
      cat.scale.set(base, base, base);
    }
  };

  animate();
}

/**
 * Play a happy wiggle animation (when confirming a choice).
 */
export function playHappyWiggle(cat: Group): void {
  const startRotY = cat.rotation.y;
  const wiggleAmount = 0.15;
  const duration = 0.5;
  const startTime = performance.now();

  const animate = (): void => {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = Math.min(elapsed / duration, 1);

    // Wiggle back and forth
    const wiggle = Math.sin(t * Math.PI * 4) * wiggleAmount * (1 - t);
    cat.rotation.y = startRotY + wiggle;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      cat.rotation.y = startRotY;
    }
  };

  animate();
}

// Made with Bob
