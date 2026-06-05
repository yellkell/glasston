/**
 * Controller haptics — resolved LIVE from the XR session, per handedness.
 *
 * Resolve the gamepad straight from `session.inputSources` (and `trackedSources`)
 * by `inputSource.handedness` at the moment we buzz — never cache a gamepad/
 * actuator reference, never index by array position. Prefer the standard
 * `vibrationActuator.playEffect()` and fall back to the legacy per-hand
 * `hapticActuators[0].pulse()`.
 *
 * Known platform issue (tracked in repo issue #1): the Meta Quest Browser after
 * OS v2.1 mis-routes WebXR controller haptics (right-hand pulse fires the left
 * motor) — a browser regression below this layer that Wolvic does not have. Our
 * routing is correct (verified by haptics-test.html), so this code is right and
 * will behave correctly once the browser is fixed.
 */

type Handedness = 'left' | 'right';

interface LooseActuator {
  pulse?: (value: number, duration: number) => unknown;
  playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>;
}
interface LooseGamepad {
  hapticActuators?: ReadonlyArray<LooseActuator>;
  vibrationActuator?: LooseActuator;
}
type XRSessionLike = { inputSources?: Iterable<unknown>; trackedSources?: Iterable<unknown> } | undefined;

/** Find the live gamepad for a hand, scanning primary then tracked sources. */
export function gamepadFor(session: XRSessionLike, hand: Handedness): LooseGamepad | undefined {
  if (!session) return undefined;
  for (const list of [session.inputSources, session.trackedSources]) {
    if (!list) continue;
    for (const raw of list) {
      const src = raw as { handedness?: string; gamepad?: LooseGamepad | null };
      if (src.handedness === hand && src.gamepad) return src.gamepad;
    }
  }
  return undefined;
}

/**
 * Buzz the named controller. Returns the API actually used (or a reason it
 * couldn't) — handy for automated routing tests.
 */
export function pulseHand(
  session: XRSessionLike,
  hand: Handedness,
  intensity = 0.7,
  durationMs = 90,
): string {
  const gp = gamepadFor(session, hand);
  if (!gp) return 'no-pad';

  // Standard API first; legacy per-hand actuator as a fallback.
  const va = gp.vibrationActuator;
  if (va?.playEffect) {
    void va
      .playEffect('dual-rumble', { duration: durationMs, strongMagnitude: intensity, weakMagnitude: intensity })
      .catch(() => {});
    return 'effect';
  }
  const legacy = gp.hapticActuators?.[0];
  if (legacy?.pulse) {
    try {
      void legacy.pulse(intensity, durationMs);
      return 'pulse';
    } catch {
      return 'pulse-err';
    }
  }
  return 'no-act';
}
