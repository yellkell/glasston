/**
 * Controller haptics — done once, correctly, in one place.
 *
 * The "left buzzes when the right should, the right never buzzes" bug comes
 * from two mistakes that we deliberately make impossible here:
 *
 *  1. Routing by array position. `session.inputSources` / actuator arrays are
 *     NOT ordered by handedness, so `actuators[handIndex]` silently swaps hands.
 *     We never do that — callers pass us the exact `Gamepad` for the hand that
 *     acted (IWSDK keys those by `handedness`), and we only ever touch an
 *     actuator that belongs to THAT gamepad.
 *
 *  2. Using only the deprecated `gamepad.hapticActuators[0].pulse()` path. It is
 *     missing on current Chromium-based headset browsers (e.g. Quest), so the
 *     pulse just never fires. We prefer the standard
 *     `gamepad.vibrationActuator.playEffect('dual-rumble', …)` and fall back to
 *     the legacy `pulse()` only when the modern API is absent.
 */

/** Non-standard / newer haptics surface that isn't in every TS DOM lib yet. */
type HapticGamepad = Gamepad & {
  vibrationActuator?: GamepadHapticActuator & {
    playEffect?: (type: string, params: Record<string, number>) => Promise<string>;
  };
  hapticActuators?: Array<
    GamepadHapticActuator & { pulse?: (value: number, duration: number) => void }
  >;
};

/**
 * Fire a short pulse on exactly the controller backing `gamepad`.
 * @param gamepad   the WebXR Gamepad for the hand that acted (may be undefined)
 * @param intensity 0..1 strength
 * @param durationMs pulse length in milliseconds
 */
export function pulseGamepad(gamepad: Gamepad | undefined, intensity = 0.5, durationMs = 70): void {
  if (!gamepad) return;
  const gp = gamepad as HapticGamepad;

  // Preferred: standard vibrationActuator (reliable on Quest Browser etc.).
  const actuator = gp.vibrationActuator;
  if (actuator?.playEffect) {
    void actuator
      .playEffect('dual-rumble', {
        duration: durationMs,
        strongMagnitude: intensity,
        weakMagnitude: intensity,
      })
      .catch(() => {
        /* some runtimes reject if a pulse is already playing — harmless */
      });
    return;
  }

  // Fallback: legacy per-gamepad actuator (older browsers / emulators).
  gp.hapticActuators?.[0]?.pulse?.(intensity, durationMs);
}
