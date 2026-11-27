// SmartRecycleBin - DOIT v1 ESP32 (the "no camera" board).
//
// Reads "ANGLE <deg>\n" lines from the AI-Thinker ESP32-CAM over a
// 2-wire UART cable (UART2 on GPIO 16/17), drives a 28BYJ-48 stepper
// (via ULN2003) to the matching bin slot, opens a lid servo for 3 s,
// then returns the stepper to its starting position.
// ESP-NOW is disabled by default in config.h (SRB_WIRED_LINK = 1) to
// reduce radio power/noise near the stepper.
//
// Wiring (per project plan):
//   GPIO 25  -> ULN2003 IN1
//   GPIO 26  -> ULN2003 IN2
//   GPIO 27  -> ULN2003 IN3
//   GPIO 14  -> ULN2003 IN4
//   GND      -> ULN2003 GND
//   5V       -> ULN2003 VCC  (motor coil power)
//   XH-5P    -> 28BYJ-48 stepper cable (keyed)
//   GPIO 18  -> servo signal
//   5V       -> servo VCC
//   GND      -> servo GND
//   1000 uF / 16 V cap -> across ULN2003 + and - (positive to +, negative to -)
//   CAM GPIO14 (TX) -> DOIT GPIO16 (UART2 RX)
//   CAM GPIO15 (RX) <- DOIT GPIO17 (UART2 TX)   [optional]
//   GND             <-> GND
//   Do NOT connect the 5V pins together. Power the motor driver from
//   its own 5V supply with a common ground and a 1000 uF capacitor.
//   The DOIT's default UART0 (GPIO 1/3) stays the USB-Serial debug port.
//
// Cycle (per ANGLE <deg> line):
//   1. Move stepper to step (binIndex * 409)
//   2. Open servo to 180 deg
//   3. Wait 3000 ms
//   4. Close servo to 0 deg
//   5. Return stepper to step SRB_STEPS_PER_REV by doing ONE FULL
//      REVOLUTION forward (moveTo(SRB_STEPS_PER_REV), not reverse).
//      This is mechanically equivalent to returning to 0 deg but is
//      less sensitive to step-skip drift, because going forward all
//      the way around means the rotor physically arrives back at its
//      0 deg detent even if a few steps were lost during the cycle.
//   6. Dither: micro-forward + back-to-SRB_STEPS_PER_REV to recover
//      any skipped steps at the 0 deg detent
//   7. Go back to reading UART

#include <Arduino.h>
#include <AccelStepper.h>
#include <ESP32Servo.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <WiFi.h>
#include "config.h"

// HALF4WIRE: 8-phase half-step drive. Must match config.h's
// SRB_STEPS_PER_REV = 2045 (measured half-steps/rev for this unit).
//
// NOTE the pin order below is (A, C, B, D) -- NOT (A, B, C, D).
// AccelStepper's FULL4WIRE/HALF4WIRE modes expect pins in the order
// that matches the motor's actual internal coil pairing, which for
// the 28BYJ-48 is IN1+IN3 as one coil and IN2+IN4 as the other --
// not the connector's numeric IN1,IN2,IN3,IN4 order. Passing pins in
// straight IN1..IN4 order energizes the coils in a sequence that
// doesn't produce a rotating field: the rotor just rocks back and
// forth in place (buzzes/vibrates) without turning. Swapping the
// middle two pins here fixes that while keeping config.h's wiring
// documentation (IN1..IN4 -> GPIO 25,26,27,14) simple and accurate.
AccelStepper stepper(AccelStepper::HALF4WIRE,
                      SRB_STEP_PIN_A, SRB_STEP_PIN_C,
                      SRB_STEP_PIN_B, SRB_STEP_PIN_D);
Servo lidServo;

// Wired link from the CAM. UART2 remapped to GPIO16/17 so UART0
// (GPIO1/3) remains the USB-Serial debug port.
HardwareSerial linkSerial(2);

// AccelStepper is polled: stepper.run() advances the stepper by one
// step if the time since the last step is >= the inter-step delay. The
// runStepperBlocking() function below calls run() in a tight loop until
// distanceToGo() reaches 0, then runs a 2000-iteration drain to flush
// any step pulses that haven't been issued yet. The 28BYJ-48's rotor
// is slow and can lag behind the firmware's counter at 800 steps/sec,
// so the drain is generous.

// Move the stepper to the absolute target step count, blocking until
// the stepper genuinely arrives (or the safety timeout elapses).
// Important: do NOT call setCurrentPosition() at the end. Doing so tells
// AccelStepper "you're at the target now" even if the physical rotor
// is short, which causes the next moveTo() to be short too.
//
// The polling loop uses distanceToGo() which is the firmware's
// position counter, not the physical rotor position. After distanceToGo()
// reaches 0, the firmware's counter says "done" but the rotor may
// still be a few steps behind. The drain loop after the main polling
// calls stepper.run() up to 2000 more times to flush any remaining
// queued step pulses. The longer drain (vs 200 before) gives the
// 28BYJ-48's slow rotor time to physically arrive at the target.
static void runStepperBlocking(long target) {
  long startPos = stepper.currentPosition();
  long distance = target - startPos;
  Serial.printf("stepper: from %ld to %ld (distance %ld)\n", startPos, target, distance);
  stepper.moveTo(target);
  unsigned long startMs = millis();
  while (stepper.distanceToGo() != 0) {
    stepper.run();
    if (millis() - startMs > SRB_STEP_TIMEOUT_MS) {
      stepper.stop();
      long endPos = stepper.currentPosition();
      Serial.printf("stepper timeout, bailing (made it from %ld to %ld, %ld steps short)\n",
                    startPos, endPos, (long)target - endPos);
      return;
    }
  }
  // Drain any remaining queued pulses. AccelStepper sometimes exits
  // distanceToGo()==0 before all step pulses have been issued. The drain
  // loop calls run() enough times to catch any stragglers. 2000 iterations
  // is generous; the loop exits early as soon as distanceToGo() is 0.
  for (int i = 0; i < 2000 && stepper.distanceToGo() != 0; i++) {
    stepper.run();
  }
  Serial.printf("stepper: arrived at %ld\n", stepper.currentPosition());
}

// After the full-revolution return move, the firmware's counter is at
// SRB_STEPS_PER_REV. The dither does a small back-and-forth wiggle:
// SRB_STEP_DITHER_STEPS forward from the current position (which
// overshoots the 360 deg mark by a few steps), then back to
// SRB_STEPS_PER_REV. This re-engages the rotor's magnetic detent
// (the stepper naturally "snaps" to the nearest stable position),
// recovering any drift up to SRB_STEP_DITHER_STEPS steps. The firmware
// counter is left at SRB_STEPS_PER_REV (= 0 effectively, since the
// physical rotor's 0 deg is the same point as SRB_STEPS_PER_REV deg).
static void ditherToFullRevolution(long base) {
  // Move forward by SRB_STEP_DITHER_STEPS, then back to base.
  // The forward move re-engages the rotor's magnetic detent, recovering
  // any drift; the back move returns the firmware's counter to
  // base while the rotor is now accurately positioned.
  stepper.moveTo(base + SRB_STEP_DITHER_STEPS);
  while (stepper.distanceToGo() != 0) stepper.run();
  for (int i = 0; i < 2000 && stepper.distanceToGo() != 0; i++) stepper.run();

  stepper.moveTo(base);
  while (stepper.distanceToGo() != 0) stepper.run();
  for (int i = 0; i < 2000 && stepper.distanceToGo() != 0; i++) stepper.run();
}

// Open the lid servo to the open angle, hold, then return to closed.
static void openAndCloseLid() {
  lidServo.write(SRB_SERVO_OPEN_DEG);
  delay(SRB_SERVO_OPEN_HOLD_MS);
  lidServo.write(SRB_SERVO_CLOSED_DEG);
}

// Find the bin index for a given angle. Returns -1 if the angle
// doesn't match any of the 5 supported values.
static int findBinForAngle(int deg) {
  for (int i = 0; i < 5; i++) {
    if (BIN_ANGLES[i] == deg) return i;
  }
  return -1;
}

// ---- ESP-NOW ------------------------------------------------------------
// AI-Thinker's WiFi station MAC. After you flash the AI-Thinker, open its
// Serial Monitor (115200 baud) and read the line "AI-Thinker MAC:
// XX:XX:XX:XX:XX:XX". Plug those bytes into THINKER_MAC below and
// re-flash this board. Once paired, ESP-NOW delivers ANGLE lines from
// the AI-Thinker in parallel with the wire.
const uint8_t THINKER_MAC[6] = { 0x84, 0x1F, 0xE8, 0x4B, 0x9C, 0xAC };

// 0 = use the same channel the DOIT v1's WiFi is already on (recommended).
#define SRB_ESPNOW_CHANNEL  0

// Volatile flag set by the ESP-NOW receive callback. Loop() reads it and
// treats it the same as a Serial-received ANGLE line.
static volatile bool g_pendingEspNow = false;
static volatile int  g_pendingAngle   = -1;
// Set by the ESP-NOW receive callback when the CAM sends a PING.
// Loop() replies with a PONG and clears the flag.
static volatile bool g_pendingPing    = false;

// ESP-NOW receive callback. Runs in WiFi task context. Just sets flags;
// loop() consumes the values and acts on them.
static void onEspNowRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
  (void)info;  // MAC address not needed; we have only one peer
  if (len <= 0 || len > 63) return;
  char buf[64];
  memcpy(buf, data, len);
  buf[len] = '\0';
  String line = String(buf);
  line.trim();
  if (line.startsWith("PING")) {
    g_pendingPing = true;
    return;
  }
  if (line.startsWith("ANGLE ")) {
    int deg = line.substring(6).toInt();
    g_pendingAngle = deg;
    g_pendingEspNow = true;
    return;
  }
  // Defensive: ignore PONG / ACK / DONE / anything else.
}

// Initialise WiFi (no connection) and ESP-NOW. Registers the AI-Thinker
// as a peer. THINKER_MAC must be correct for ESP-NOW to deliver packets.
static bool espNowInit() {
  // ESP-NOW needs WiFi initialised. Don't connect to any AP.
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  // Find the strongest AP and force the DOIT's radio to its channel.
  // The CAM is connected to this AP and is on this channel for ESP-NOW.
  // Without this, the DOIT's PONG/ACK/DONE packets are sent on the
  // DOIT's default channel and never reach the CAM.
  int32_t bestRSSI     = -1000;
  uint8_t bestChan     = 1;
  int     strongestIdx = 0;
  int n = WiFi.scanNetworks(false, true);  // async=false, show_hidden=true
  for (int i = 0; i < n; i++) {
    if (WiFi.RSSI(i) > bestRSSI) {
      bestRSSI     = WiFi.RSSI(i);
      bestChan     = WiFi.channel(i);
      strongestIdx = i;
    }
  }
  WiFi.scanDelete();
  if (n > 0) {
    // Force the underlying radio to the AP's channel. WiFi.channel()
    // only updates the station interface's channel; ESP-NOW transmits
    // on whatever channel the radio is actually on, which can be the
    // default (1) if no softAP is initialized. Going through the
    // promiscuous API forces the radio hardware itself to the channel
    // so both station mode and ESP-NOW use the same frequency.
    esp_wifi_set_promiscuous(true);
    esp_err_t chErr = esp_wifi_set_channel(bestChan, WIFI_SECOND_CHAN_NONE);
    esp_wifi_set_promiscuous(false);
    Serial.printf("DOIT: forced WiFi channel to %d (AP '%s', RSSI %d, set_channel err=0x%x)\n",
                  bestChan, WiFi.SSID(strongestIdx).c_str(), bestRSSI,
                  (unsigned)chErr);
    Serial.printf("DOIT: post-set WiFi.channel() reports %d\n", WiFi.channel());
  } else {
    Serial.println("DOIT: no APs found, staying on default channel");
  }

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return false;
  }
  esp_now_register_recv_cb(onEspNowRecv);

  // Diagnostic: report the actual station channel vs the value the
  // ESP-NOW peer entry will use. WiFi.channel() controls the station
  // interface; ESP-NOW on the DOIT can run on a different channel
  // (default 1) if the softAP interface is not initialized. If these
  // two values ever disagree, the PONG/ACK/DONE packets go out on a
  // channel the CAM is not listening on, and the CAM logs "no PONG".
  Serial.printf("DOIT: diag station channel = %d, peer.channel = %d (SRB_ESPNOW_CHANNEL = %d)\n",
                WiFi.channel(), SRB_ESPNOW_CHANNEL, SRB_ESPNOW_CHANNEL);

  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, THINKER_MAC, 6);
  peer.channel = SRB_ESPNOW_CHANNEL;
  peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("ESP-NOW add_peer failed (check THINKER_MAC is correct)");
    return false;
  }
  Serial.println("ESP-NOW ready, peer registered");
  return true;
}

void setup() {
  // Use the default UART0 on GPIO 1 (TX) / 3 (RX) for the USB-Serial
  // debug port. The inter-board link is UART2 on GPIO16/17, so GPIO14
  // remains free for the stepper's D pin. Using GPIO14 for Serial would
  // conflict with SRB_STEP_PIN_D and make the stepper buzz without turning.
  Serial.begin(SRB_UART_BAUD);
#if SRB_WIRED_LINK
  linkSerial.begin(SRB_UART_BAUD, SERIAL_8N1, SRB_LINK_RX_PIN, SRB_LINK_TX_PIN);
  Serial.printf("Wired link: UART2 RX=GPIO%d TX=GPIO%d at %d baud\n",
                SRB_LINK_RX_PIN, SRB_LINK_TX_PIN, SRB_UART_BAUD);
#endif

  // Force stepper and servo pins to a known LOW state BEFORE any other
  // initialization. Without this, the GPIO pins are in an undefined
  // state during the first few milliseconds of boot (input floating,
  // high-impedance). If they happen to read HIGH, the ULN2003 will
  // energize stepper coils and the servo will see noise on its signal
  // pin, causing the servo to jitter and the 5V rail to sag. By
  // setting these pins to OUTPUT+LOW immediately, we guarantee no
  // coils are energized and the servo signal is at 0V (which the SG90
  // interprets as "stay where you are"). This matters most when the
  // DOIT is powered from the external 5V supply alone (no USB); with
  // USB, the LDO has more headroom and the sag is less noticeable.
  pinMode(SRB_STEP_PIN_A, OUTPUT);
  pinMode(SRB_STEP_PIN_B, OUTPUT);
  pinMode(SRB_STEP_PIN_C, OUTPUT);
  pinMode(SRB_STEP_PIN_D, OUTPUT);
  digitalWrite(SRB_STEP_PIN_A, LOW);
  digitalWrite(SRB_STEP_PIN_B, LOW);
  digitalWrite(SRB_STEP_PIN_C, LOW);
  digitalWrite(SRB_STEP_PIN_D, LOW);
  pinMode(SRB_SERVO_PIN, OUTPUT);
  digitalWrite(SRB_SERVO_PIN, LOW);

  lidServo.setPeriodHertz(50);
  lidServo.attach(SRB_SERVO_PIN, 500, 2400);
  lidServo.write(SRB_SERVO_CLOSED_DEG);
  stepper.setMaxSpeed(SRB_STEP_MAX_SPEED);
  stepper.setAcceleration(SRB_STEP_ACCEL);
  stepper.setCurrentPosition(0);

#if SRB_WIRED_LINK
  Serial.println("SmartRecycleBin DOIT v1 ready");
  Serial.println("Link: wired UART only (ESP-NOW disabled)");
#else
  espNowInit();

  // Print this board's MAC so the user can plug it into the AI-Thinker's
  // DOIT_MAC and re-flash.
  uint8_t mac[6];
  WiFi.macAddress(mac);
  Serial.printf("DOIT v1 MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  Serial.println("SmartRecycleBin DOIT v1 ready");
  Serial.println("Link: ESP-NOW only (no physical wire)");
#endif
}

// Running absolute offset for "home" (0 deg). This increases by one
// full revolution every cycle, so every move ever issued to the
// stepper is a forward moveTo() to a larger absolute step count.
// AccelStepper's position counter is absolute, not modulo-2045, so
// after a cycle ends at step N * SRB_STEPS_PER_REV, the *next* bin
// target must be computed relative to that same base -- not to 0 --
// or moveTo() will compute a negative distanceToGo() and the motor
// will run backward instead of forward.
static long homeBase = 0;

void loop() {
  // AccelStepper's run() is called inside runStepperBlocking() during
  // a move. Between moves it does not need to be called.
  // ESP-NOW is the primary inter-board path; Serial is only used for
  // debug logging and an optional manual ANGLE entry for bench testing
  // the DOIT in isolation.
#if SRB_WIRED_LINK
  if (!linkSerial.available() && !Serial.available()) return;
#else
  if (!g_pendingEspNow && !g_pendingPing && !Serial.available()) return;

  // PING liveness probe from the CAM. Reply over ESP-NOW and fall
  // through so a co-arriving ANGLE on the wire is still handled in
  // the same pass.
  if (g_pendingPing) {
    g_pendingPing = false;
    const char pong[] = "PONG\n";
    esp_now_send(THINKER_MAC, (const uint8_t *)pong, sizeof(pong) - 1);
    Serial.println("ESP-NOW <- PONG");
  }
#endif

  int deg = -1;

#if SRB_WIRED_LINK
  // Wired link: read "ANGLE <deg>\n" from the CAM over GPIO16.
  if (linkSerial.available()) {
    String line = linkSerial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("ANGLE ")) {
      deg = line.substring(6).toInt();
      Serial.printf("WIRE <- %s\n", line.c_str());
    } else if (line.length() > 0) {
      // Echo CAM debug lines so they are visible on the DOIT's USB monitor.
      Serial.printf("CAM: %s\n", line.c_str());
    }
  }
#else
  // ESP-NOW is the primary inter-board path. The physical wire
  // between the two boards is no longer connected.
  if (g_pendingEspNow) {
    g_pendingEspNow = false;
    deg = g_pendingAngle;
    g_pendingAngle = -1;
  }
#endif

  // Optional: allow manual ANGLE entry via the DOIT's USB-Serial
  // for bench testing the DOIT in isolation. Only active if the user
  // types an "ANGLE <deg>" line into the DOIT's Serial Monitor.
  if (deg < 0 && Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("ANGLE ")) {
      deg = line.substring(6).toInt();
    }
  }

  if (deg < 0) return;

  int binIndex = findBinForAngle(deg);
  if (binIndex < 0) {
    Serial.printf("unknown angle %d, ignored\n", deg);
    return;
  }

  long target = homeBase + (long)binIndex * (SRB_STEPS_PER_REV / 5);
  Serial.printf("ANGLE %d -> bin %d -> step %ld\n", deg, binIndex, target);
  Serial.printf("  homeBase=%ld  perBin=%ld  total=%ld\n",
                homeBase, (long)binIndex * (SRB_STEPS_PER_REV / 5), target);

#if !SRB_WIRED_LINK
  // ACK before running the move so the CAM knows we received the
  // angle. If the move later fails or stalls, the CAM will see a
  // timeout on the wire path and log it; the ACK is the "queued"
  // signal, not the "completed" signal.
  {
    char ack[24];
    int n = snprintf(ack, sizeof(ack), "ACK %d\n", deg);
    if (n > 0) {
      esp_now_send(THINKER_MAC, (const uint8_t *)ack, n);
      Serial.printf("ESP-NOW <- ACK %d\n", deg);
    }
  }
#endif

  runStepperBlocking(target);
  delay(150);                      // let stepper coils de-energize
  openAndCloseLid();
  delay(150);                      // let servo settle, cap charge
  // Return to the starting point by doing ONE FULL REVOLUTION forward
  // from homeBase (moveTo(homeBase + SRB_STEPS_PER_REV)) instead of
  // reversing back to target's origin. This way, even if the rotor
  // skipped a few steps during the forward+open+reverse cycle, doing
  // a full 360 deg forward walk brings the rotor physically back to
  // its mechanical 0 deg detent. The firmware's counter ends at
  // homeBase + SRB_STEPS_PER_REV, which becomes the new homeBase for
  // the next cycle, so every future move keeps going forward instead
  // of flipping direction.
  homeBase += SRB_STEPS_PER_REV;
  runStepperBlocking(homeBase);
  ditherToFullRevolution(homeBase);

  Serial.println("cycle complete");

#if !SRB_WIRED_LINK
  // DONE after the cycle fully finishes (servo closed, stepper at
  // home). Lets the CAM log end-to-end success in its own monitor.
  {
    char done[24];
    int n = snprintf(done, sizeof(done), "DONE %d\n", deg);
    if (n > 0) {
      esp_now_send(THINKER_MAC, (const uint8_t *)done, n);
      Serial.printf("ESP-NOW <- DONE %d\n", deg);
    }
  }
#endif
}
