#ifndef SRB_NO_CAM_CONFIG_H
#define SRB_NO_CAM_CONFIG_H

// ----- Pin assignments (DOIT v1 ESP32 DevKit) ---------------------
// Stepper: ULN2003 driver board inputs IN1..IN4
#define SRB_STEP_PIN_A    25
#define SRB_STEP_PIN_B    26
#define SRB_STEP_PIN_C    27
#define SRB_STEP_PIN_D    14
// Servo: signal wire (orange/yellow), 50 Hz PWM
#define SRB_SERVO_PIN     18

// ----- UART (wired link from the AI-Thinker ESP32-CAM) -----------
// Set SRB_WIRED_LINK to 1 to use the cable, 0 for ESP-NOW.
// DOIT UART2 is remapped to GPIO16 (RX) / GPIO17 (TX) so the USB
// debug port on GPIO1/3 stays free. Cross-connect:
//   CAM GPIO14 (TX) -> DOIT GPIO16 (RX)
//   CAM GPIO15 (RX) <- DOIT GPIO17 (TX)   [optional]
//   GND             <-> GND
#define SRB_WIRED_LINK     1
#define SRB_LINK_RX_PIN    16
#define SRB_LINK_TX_PIN    17
#define SRB_UART_BAUD      115200

// ----- Stepper parameters -----------------------------------------
// HALF4WIRE mode: 8-phase drive, each "step" is a half-step.
// MEASURED on the actual hardware (not the textbook 4096 figure):
// this specific motor completes one full physical revolution in
// ~2048 half-steps, not 4096 -- its real internal gear ratio is
// roughly half of the commonly-advertised 64:1. Trust the measured
// value over datasheet numbers for this unit.
// We use 2045 (not 2048) so 2045 / 5 = exactly 409 steps per bin,
// with 0 cumulative rounding error across all 5 bins. The 3-step
// difference from the measured 2048 (~0.5 deg) is absorbed by the
// stepper's gear slop, same as the original full-step calibration.
#define SRB_STEPS_PER_REV    2045
#define SRB_STEP_MAX_SPEED   70      // steps/sec (half-step rate; was 100, lowered for more torque per step)
#define SRB_STEP_ACCEL       35      // steps/sec^2 (was 50, smoother ramp)
#define SRB_STEP_TIMEOUT_MS  45000   // safety: bail if not arrived in 45s (full rev ~31s at 70 steps/s)
#define SRB_STEP_DITHER_STEPS 256    // back-and-forth micro-moves after returning to SRB_STEPS_PER_REV to recover skipped steps (~45 deg of recovery range at 2045 steps/rev, was 128)

// ----- Servo parameters ------------------------------------------
#define SRB_SERVO_OPEN_DEG     170
#define SRB_SERVO_CLOSED_DEG   0
#define SRB_SERVO_OPEN_HOLD_MS 3000  // 3 s lid open

// ----- Bin mapping ------------------------------------------------
// The order in this array is the order the stepper visits bins.
// index 0 -> 0 deg, index 1 -> 72 deg, ..., index 4 -> 288 deg.
// Edit this array to match the physical bin layout when you build it.
// The Supabase function and AI-Thinker ino already use this order.
const int BIN_ANGLES[5] = { 0, 72, 144, 216, 288 };

#endif // SRB_NO_CAM_CONFIG_H
