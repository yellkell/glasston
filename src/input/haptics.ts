/**
 * Controller haptics — resolved LIVE from the XR session, per handedness.
 *
 * Hard-won lessons baked in here (this exact "left buzzes for right, right
 * never buzzes" bug has bitten us before):
 *
 *  1. Resolve the gamepad straight from `session.inputSources` (and
 *     `trackedSources`) by `inputSource.handedness` at the moment we buzz —
 *     never cache a gamepad/actuator reference, never index by array position.
 *     Array position is NOT stable per hand; a cached actuator can also go
 *     stale. This guarantees the pulse reaches the controller we name.
 *
 *  2. Prefer the per-hand Meta extension `gamepad.hapticActuators[0].pulse()`,
 *     which maps correctly to each controller on the Quest Browser. The newer
 *     `vibrationActuator.playEffect()` is used only as a fallback because for
 *     XR gamepads it has historically driven the wrong/!shared actuator.
 *
 * A small diagnostic snapshot is exposed (`getHapticsDebug`) so the headset can
 * show, at a glance, what each hand actually exposes and which one last fired.
 */

type Handedness = 'left' | 'right';

/** Loose view of the non-standard / over-strict haptics surfaces. */
interface LooseActuator {
  pulse?: (value: number, duration: number) => unknown;
  playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>;
}
interface LooseGamepad {
  hapticActuators?: ReadonlyArray<LooseActuator>;
  vibrationActuator?: LooseActuator;
}
// Sessions/sources are iterated loosely so the real DOM XR types slot in without
// fighting their (stricter) actuator signatures.
type XRSessionLike = { inputSources?: Iterable<unknown>; trackedSources?: Iterable<unknown> } | undefined;

/** Find the live gamepad for a hand, scanning primary then tracked sources. */
function gamepadFor(session: XRSessionLike, hand: Handedness): LooseGamepad | undefined {
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

/** Which actuator API a gamepad exposes — for the on-screen diagnostic. */
function actuatorKind(gp: LooseGamepad | undefined): string {
  if (!gp) return '—';
  if (gp.hapticActuators?.[0]?.pulse) return 'pulse';
  if (gp.vibrationActuator?.playEffect) return 'effect';
  if (gp.vibrationActuator?.pulse) return 'v.pulse';
  return 'none';
}

let _last = '—';
let _diag = 'L:? R:?';

/**
 * Buzz the named controller. Returns the API actually used (or a reason it
 * couldn't), which is also recorded for the diagnostic readout.
 */
export function pulseHand(
  session: XRSessionLike,
  hand: Handedness,
  intensity = 0.7,
  durationMs = 90,
): string {
  const gp = gamepadFor(session, hand);
  let used: string;
  if (!gp) {
    used = 'no-pad';
  } else if (gp.hapticActuators?.[0]?.pulse) {
    try {
      void gp.hapticActuators[0].pulse!(intensity, durationMs);
      used = 'pulse';
    } catch {
      used = 'pulse-err';
    }
  } else if (gp.vibrationActuator?.playEffect) {
    void gp.vibrationActuator
      .playEffect('dual-rumble', { duration: durationMs, strongMagnitude: intensity, weakMagnitude: intensity })
      .catch(() => {});
    used = 'effect';
  } else if (gp.vibrationActuator?.pulse) {
    try {
      void gp.vibrationActuator.pulse(intensity, durationMs);
      used = 'v.pulse';
    } catch {
      used = 'v.pulse-err';
    }
  } else {
    used = 'no-act';
  }
  _last = `${hand[0].toUpperCase()}:${used}`;
  return used;
}

/** Refresh the per-hand availability snapshot (cheap; call once per frame). */
export function probeHaptics(session: XRSessionLike): void {
  _diag = `L:${actuatorKind(gamepadFor(session, 'left'))} R:${actuatorKind(gamepadFor(session, 'right'))}`;
}

/** One-line haptics status for the HUD: per-hand actuator + last hand buzzed. */
export function getHapticsDebug(): string {
  return `HAPTICS ${_diag} last:${_last}`;
}
