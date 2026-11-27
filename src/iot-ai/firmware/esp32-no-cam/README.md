# SmartRecycleBin — DOIT v1 ESP32 (the "no camera" board)

The companion board for the AI-Thinker ESP32-CAM. This board receives
`ANGLE <deg>\n` lines over UART, drives a 28BYJ-48 stepper (via ULN2003)
to the matching bin slot, opens a lid servo for 3 s, then returns the
stepper to its starting position.

## What it does

For every `ANGLE <deg>` line received:

1. Look up the bin index (0 = paper, 1 = metal, 2 = biological, 3 = plastic, 4 = trash)
2. Drive the stepper forward to the corresponding position (409 half-steps per bin in HALF4WIRE mode)
3. Open the lid servo to 180°
4. Wait 3 seconds
5. Close the lid servo to 0°
6. Walk the stepper forward one FULL revolution back to its physical 0° detent (this is the "return" — see note below)
7. Do a small back-and-forth "dither" to settle the rotor into its magnetic detent
8. Print `cycle complete` and go back to reading UART

**The "return" is a full forward revolution, not a reverse move.** The firmware maintains a running `homeBase` absolute offset that increases by `SRB_STEPS_PER_REV` each cycle. Every `moveTo()` issued to the stepper is a forward move to a larger absolute step count. This avoids the issue where a reverse move to "step 0" would cause the firmware to compute a negative distance-to-go and run the motor backward.

## Wiring (DOIT v1 ESP32 DevKit)

```
DOIT v1 GPIO    Goes to
-----------     --------------------------------
GPIO 25         ULN2003 IN1
GPIO 26         ULN2003 IN2
GPIO 27         ULN2003 IN3
GPIO 14         ULN2003 IN4
GND             ULN2003 GND (signal ground)
5V (USB)        ULN2003 VCC (motor coil power)
XH-5P socket    28BYJ-48 stepper cable (keyed; only fits one way)
GPIO 18         Servo signal (orange/yellow wire)
5V (USB)        Servo VCC (red wire)
GND             Servo GND (brown/black wire)
GPIO 1 (TX)     AI-Thinker GPIO 3 (RX)  -- UART link
GPIO 3 (RX)     AI-Thinker GPIO 1 (TX)  -- UART link
GND             Shared ground with AI-Thinker
5V (optional)   AI-Thinker 5V header pin  -- shared 5V rail
```

### Important: the stepper pin order in the ino is NOT (A, B, C, D)

The `AccelStepper` constructor in `esp32-no-cam.ino` passes the pins in the order `(A, C, B, D)` — not the natural `(A, B, C, D)` order. This is because the 28BYJ-48's internal coil pairings are (IN1+IN3) and (IN2+IN4), and `HALF4WIRE` mode expects the pins in the order that matches those internal pairs. Passing pins in straight numeric order (`A, B, C, D`) makes the rotor buzz in place without turning. The pin order swap in the constructor fixes that while keeping the wiring documentation simple.

The `#define`s in `config.h` are still labeled `A=25, B=26, C=27, D=14` for documentation clarity. The swap happens inside the `AccelStepper` constructor in the ino.

### Decoupling capacitor

Solder or clip a **1000 µF / 16 V** electrolytic capacitor across the
ULN2003 driver's `+` and `−` motor power pins (the side near the XH-5P
stepper socket). The cap's **positive lead** goes to `+`; the **negative
lead** (the one with the white stripe on the body) goes to `−`. Keep
the cap leads short — within 1-2 cm of the screw terminal.

## Arduino IDE setup

1. **Sketch → Include Library → Manage Libraries**
2. Install: **AccelStepper** (by Mike McCauley)
3. Install: **ESP32Servo** (by Kevin Harrington) — the built-in `Servo.h`
   does not work on ESP32, you need the ESP32-specific version
4. **Tools → Board → DOIT ESP32 DEVKIT V1**
5. **Tools → Partition Scheme → Default 4MB with spiffs** (or "Huge APP"
   if the sketch grows)
6. **Tools → Upload Speed → 115200**
7. **Tools → Port →** pick the COM port that appears when you plug the
   DOIT v1 in

## Power-up behavior

On boot, the firmware:
- Starts UART0 at 115200 baud
- Attaches the lid servo and writes 0° (lid closed)
- Sets the stepper's position counter to 0 — assumes the user has manually
  aligned the stepper shaft to 0° before applying power
- Prints `SmartRecycleBin DOIT v1 ready` once
- Begins reading UART

**Manually align the stepper shaft to 0° before applying power.**
The firmware does NOT run a homing routine. The 28BYJ-48 has no
endstop switch natively, so a "find home on boot" routine would
require adding a microswitch and an extra GPIO.

## Test procedure

1. Power the DOIT v1 via USB. Open Serial Monitor at 115200 baud with
   line ending "Newline".
2. You should see `SmartRecycleBin DOIT v1 ready` once on boot.
3. With the stepper shaft physically at 0°, type `ANGLE 72` in the
   input box and press Enter.
4. The stepper should rotate to bin 1 (~72°), the lid servo should
   sweep to 180° and back, the stepper should walk forward through
   the other bins back to 0°, and the dither should wiggle slightly.
   You should see:
   ```
   ANGLE 72 -> bin 1 -> step <some large number>
   cycle complete
   ```
   The "step <some large number>" will be roughly `homeBase + 409`
   (not 409), because `homeBase` accumulates over time. The exact
   number grows with each cycle.
5. Try `ANGLE 144`, `ANGLE 216`, `ANGLE 288`, `ANGLE 0` to verify all
   five positions.
6. Try `ANGLE 999` to confirm the unknown-angle case is handled
   (output: `unknown angle 999, ignored`).

## End-to-end test with the AI-Thinker

Once both boards are flashed and wired:

1. Power the AI-Thinker (via 5V on the header pin, shared 5V from the
   DOIT's USB).
2. Wave a hand within 8 cm of the HC-SR04 on the AI-Thinker.
3. The AI-Thinker flash LED strobes, the JPEG is uploaded to Supabase,
   and the AI-Thinker sends `ANGLE <deg>\n` to the DOIT.
4. The DOIT runs the same cycle as in the manual test above.
5. The result is visible in the DOIT's Serial Monitor as
   `ANGLE 72 -> bin 1 -> step <number>` followed by `cycle complete`.

## Adjusting for your physical bin

The `BIN_ANGLES` array in `config.h` is the order the stepper visits bins.
Default order matches the Supabase function and AI-Thinker ino:

| index | label       | angle | Supabase |
|-------|-------------|-------|----------|
| 0     | paper       | 0°    | BIN_ANGLES[0] |
| 1     | metal       | 72°   | BIN_ANGLES[1] |
| 2     | biological  | 144°  | BIN_ANGLES[2] |
| 3     | plastic     | 216°  | BIN_ANGLES[3] |
| 4     | trash       | 288°  | BIN_ANGLES[4] |

If your physical bin has metal at position 0 and paper at position 1,
just change the array to `{ 72, 0, 144, 216, 288 }` or similar. This
only affects the DOIT, no need to change the Supabase function or the
AI-Thinker ino.

## Tuning

In `config.h`:
- `SRB_STEP_MAX_SPEED` (100) — half-steps/sec. Lower if the stepper
  stalls under load. Higher to make the move faster.
- `SRB_STEP_ACCEL` (50) — half-steps/sec². Higher = snappier, more torque.
  Lower = smoother, less motor noise.
- `SRB_SERVO_OPEN_HOLD_MS` (3000) — how long the lid stays open.
  Increase if the user needs more time, decrease for faster cycle.
- `SRB_STEP_DITHER_STEPS` (128) — how far the post-cycle dither
  moves the rotor forward and back to settle the detent. At 128
  half-steps, this is roughly 22.5° of recovery range.
- `SRB_STEPS_PER_REV` (2045) — **measured on the actual hardware,
  not the textbook 4096 figure.** This specific motor completes
  one revolution in 2048 half-steps (real gear ratio is roughly
  half of the commonly-advertised 64:1). The 3-step difference
  from 2048 absorbs cleanly into the 5-bin layout. Don't change this
  without recalibrating with an endstop.

## Files

- `esp32-no-cam.ino` — main sketch
- `config.h` — pin assignments and tunable parameters
