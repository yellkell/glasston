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

type Method = 'pulse' | 'effect';

/** Buzz a specific gamepad with a chosen API. Returns true if it issued a call. */
function pulseWith(gp: LooseGamepad | undefined, method: Method, intensity: number, durationMs: number): boolean {
  if (!gp) return false;
  if (method === 'pulse') {
    const a = gp.hapticActuators?.[0];
    if (a?.pulse) {
      try {
        void a.pulse(intensity, durationMs);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
  const va = gp.vibrationActuator;
  if (va?.playEffect) {
    void va.playEffect('dual-rumble', { duration: durationMs, strongMagnitude: intensity, weakMagnitude: intensity }).catch(() => {});
    return true;
  }
  return false;
}

/**
 * Buzz the named controller. Returns the API actually used (or a reason it
 * couldn't), which is also recorded for the diagnostic readout.
 *
 * `playEffect` is tried FIRST: on the Quest Browser the legacy
 * `hapticActuators[0].pulse()` mis-routes to the left controller, while
 * `vibrationActuator.playEffect()` correctly drives each hand (confirmed
 * on-device). Pulse is kept only as a fallback for runtimes lacking playEffect.
 */
export function pulseHand(
  session: XRSessionLike,
  hand: Handedness,
  intensity = 0.7,
  durationMs = 90,
): string {
  const gp = gamepadFor(session, hand);
  let used: string;
  if (!gp) used = 'no-pad';
  else if (pulseWith(gp, 'effect', intensity, durationMs)) used = 'effect';
  else if (pulseWith(gp, 'pulse', intensity, durationMs)) used = 'pulse';
  else used = 'no-act';
  _last = `${hand[0].toUpperCase()}:${used}`;
  return used;
}

/** Refresh the per-hand snapshot: actuator API, count, and cross-hand identity. */
export function probeHaptics(session: XRSessionLike): void {
  const l = gamepadFor(session, 'left');
  const r = gamepadFor(session, 'right');
  const sameGp = !!l && l === r ? ' SAMEgp' : '';
  const la = l?.hapticActuators?.[0];
  const ra = r?.hapticActuators?.[0];
  const sameAct = !!la && la === ra ? ' SAMEact' : '';
  _diag =
    `L:${actuatorKind(l)}#${l?.hapticActuators?.length ?? 0} ` +
    `R:${actuatorKind(r)}#${r?.hapticActuators?.length ?? 0}${sameGp}${sameAct}`;
}

/** Two compact lines for the HUD diagnostic. */
export function getHapticsDebugLines(): string[] {
  return [_diag, `last:${_last}`];
}
