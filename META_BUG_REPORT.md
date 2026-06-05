# Meta Quest — controller haptics routing regression

Paste-ready bug report for submission to Meta. Fill in the four bracketed fields
at the top (the **system build number** is the important one:
*Settings → System → Software Update → Version*).

**Live minimal repro:** https://yellkell.github.io/glasston/haptics-repro.html
(framework-free WebXR page — Enter VR, pull each trigger; it buzzes the
same-hand controller and logs the exact actuator/API it called.)

## Where to submit
1. **In-headset** — Settings → Help and Support → **Report a Problem** (attaches
   system logs from the affected device; do this one for sure).
2. **Developer** — developers.meta.com/horizon → Support / bug report.
3. **Forums** — add to the existing thread "Haptics are BROKEN for Quest 3
   [MAJOR BUG!]" and/or the OpenXR Development category.

---

```
Title: [Regression] Controller haptics route to the wrong motor in ALL apps
after recent system update (right-hand pulse fires the left controller)

Headset: Meta Quest [2 / 3 / 3S / Pro]
System software version / build: [Settings → System → Software Update → Version]
Controllers: [Touch Plus / Touch Pro]
Onset: started after updating to the above build; the same apps had correct
haptics on the previous build.

SUMMARY
After a recent system update, controller haptic feedback is sent to the WRONG
physical controller across every app on my headset — including apps that had
correct, working haptics before the update. A haptic pulse requested on the
RIGHT controller fires the LEFT controller's motor; the right motor does not
fire when targeted from the right input source. Affects native apps and WebXR.

SCOPE (why this is a runtime regression, not app code)
- Reproduces in multiple unrelated apps, native and WebXR — not just my own.
- Apps that were correct before the update now misbehave -> regression in the
  system/OpenXR runtime, below the application layer.
- 100% reproducible, every session.

WEBXR TECHNICAL DETAIL
- Gamepad resolved from XRInputSource by inputSource.handedness.
- Calling gamepad.hapticActuators[0].pulse() OR
  gamepad.vibrationActuator.playEffect('dual-rumble', {...}) on the
  RIGHT-handed input source actuates the LEFT motor.
- Verified via automated test that the app selects the actuator object
  belonging to the right-handed input source (object identity confirmed), so
  the mis-routing occurs beneath the application layer.

MINIMAL REPRO (no engine, ~120 lines of vanilla WebXR)
  https://yellkell.github.io/glasston/haptics-repro.html
  1. Open in Meta Quest Browser, tap "Enter VR".
  2. Pull the RIGHT trigger -> the LEFT controller vibrates (wrong).
     The on-screen log shows it called pulse()/playEffect() for hand=right.
  3. Pull the LEFT trigger -> left vibrates / right never does.

EXPECTED: A pulse targeted at the right controller vibrates the right
controller; left targets left.
ACTUAL: Right-targeted pulses vibrate the left controller; the right controller
never vibrates from its own input source.

Logs: attached via in-headset Report a Problem.
```
