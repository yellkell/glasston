/**
 * Controller haptics — resolved LIVE from the XR session, per handedness.
 *
 * Resolve the gamepad straight from `session.inputSources` (and `trackedSources`)
 * by `inputSource.handedness` at the moment we buzz — never cache a gamepad/
 * actuator reference, never index by array position.
 *
 * IMPORTANT (Meta Quest Browser): the standard `vibrationActuator.playEffect()`
 * actuates the WRONG physical motor for XR controllers (confirmed on-device:
 * firing the right hand buzzed the left), while the legacy per-hand
 * `gamepad.hapticActuators[0].pulse()` drives the correct motor. So we call
 * `pulse()` FIRST and only fall back to `playEffect()` when no pulse actuator
 * exists — never both, so we can't double-buzz. `pulseHand` returns the API it
 * used for tests/diagnostics.
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

  // Per-hand legacy actuator first — this is the one that routes correctly on
  // the Quest Browser.
  const legacy = gp.hapticActuators?.[0];
  if (legacy?.pulse) {
    try {
      void legacy.pulse(intensity, durationMs);
      return 'pulse';
    } catch {
      /* fall through to playEffect */
    }
  }
  // Fallback only when there is no legacy actuator at all.
  const va = gp.vibrationActuator;
  if (va?.playEffect) {
    void va
      .playEffect('dual-rumble', { duration: durationMs, strongMagnitude: intensity, weakMagnitude: intensity })
      .catch(() => {});
    return 'effect';
  }
  return 'no-act';
}

/**
 * Buzz BOTH controllers. Workaround for the Meta runtime regression (a recent
 * system update mis-routes controller haptics across ALL apps, so per-hand
 * directionality can't be honoured below this layer). Buzzing both guarantees
 * the acting hand always gets feedback instead of a dead/wrong-hand buzz.
 * Revert callers to `pulseHand(session, hand)` once the runtime is fixed.
 */
export function pulseBothHands(session: XRSessionLike, intensity = 0.7, durationMs = 90): void {
  pulseHand(session, 'left', intensity, durationMs);
  pulseHand(session, 'right', intensity, durationMs);
}
