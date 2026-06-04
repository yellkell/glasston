/**
 * Controller haptics — resolved LIVE from the XR session, per handedness.
 *
 * Resolve the gamepad straight from `session.inputSources` (and `trackedSources`)
 * by `inputSource.handedness` at the moment we buzz — never cache a gamepad/
 * actuator reference, never index by array position. Then prefer the standard
 * `vibrationActuator.playEffect()` and fall back to the legacy per-hand
 * `hapticActuators[0].pulse()`.
 *
 * NOTE: on the Meta Quest Browser, controller haptics have been observed to
 * actuate the wrong physical motor regardless of which (correct) per-hand
 * actuator we call — a platform/driver issue below this layer. `pulseHand`
 * returns which API it used so callers/tests can verify routing.
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
