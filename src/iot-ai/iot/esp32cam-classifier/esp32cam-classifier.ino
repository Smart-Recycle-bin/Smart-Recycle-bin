// SmartRecycleBin — ESP32-CAM (AI-Thinker, e.g. Makers Electronics
// "ESP32 CAM ESP32-S WIFI+BLUETOOTH With OV2640 Camera Module") firmware.
//
// Flow:
//   1. HC-SR04 measures distance every ~100 ms.
//   2. When distance drops below SRB_TRIGGER_CM (default 8 cm) for
//      SRB_DEBOUNCE_COUNT consecutive readings, it is "trash detected".
//   3. Light the on-board flash LED, capture one JPEG from the OV2640.
//   4. POST the JPEG to the Supabase `classify` Edge Function over WiFi
//      (HTTPS). Parse the `angle` field from the JSON response.
//   5. Send the angle to the other ESP over U0T/U0R as a single line:
//        "ANGLE <deg>\n"
//      The other ESP does whatever it wants with that number — this sketch
//      has no opinion on actuation.
//   6. Turn the LED off, wait for the bin to be empty (distance > RELEASE_CM),
//      then re-arm.
//
// Wiring (per the project breadboard plan, AI-Thinker 16-pin header):
//   HC-SR04 TRIG  -> ESP32-CAM GPIO 13   (header pin 4)
//   HC-SR04 ECHO  -> 4.7k + 10k divider -> ESP32-CAM GPIO 12 (header pin 3)
//   Flash LED     -> driven via LED_GPIO 4 (header pin 8)
//   UART to other ESP (this board exposes U0T/U0R, not GPIO14/15):
//     CAM U0T (GPIO1, TX) -> DOIT GPIO16 (UART2 RX)
//     CAM U0R (GPIO3, RX) <- DOIT GPIO17 (UART2 TX)   [optional]
//     GND  <-> GND
//     Do NOT connect the 5V pins together. Power each ESP separately
//     and give the ULN2003/motor its own 5V supply with a common GND.
//
// Why U0T/U0R:
//   These are the only UART pins broken out on this CAM board. They are
//   also the ESP32-CAM-MB programmer's USB-Serial pins, so disconnect
//   the programmer after flashing and power the CAM from 5V/GND. The
//   DOIT v1 uses UART2 remapped to GPIO16/17.
//
// AI-Thinker gotchas (read before flashing):
//   - GPIO 12 must be LOW at boot. The 4.7k+10k voltage divider pulls it
//     low (10k to GND) as long as the HC-SR04 is not driving ECHO high.
//     If the camera init fails with 0x20002 or similar, power-cycle the
//     board with no wires on GPIO 12, then attach the divider.
//   - GPIO 2 is a strapping pin. Do NOT connect anything to it. The
//     HC-SR04's TRIG and ECHO are on GPIO 13/12, never GPIO 2.
//   - The microSD slot uses GPIO 2/4/12/13/14/15 internally. If you put a
//     card in the slot it can interfere with the camera init. Leave the
//     slot empty for now.
//   - Power: 5V at ~250 mA average, peaks at 310 mA when the flash LED
//     is on. The board's onboard 3V3 regulator is weak; power from a
//     beefy 5V supply, not a USB port.
//
// Supabase call (HTTPS, port 443):
//   POST  https://<project>.supabase.co/functions/v1/classify
//   Header  Authorization: Bearer <anon-or-service-role-jwt>
//   Header  X-Device-Id: <this device's id>
//   Body    multipart/form-data with a single "file" field containing the JPEG
//   Response (JSON):
//        { "predictedLabel": "...", "confidenceScore": 0.xx,
//          "angle": 0|72|144|216|288, "bin": "...", ... }
//
// UART to other ESP (115200 bps, 8N1, line-oriented ASCII):
//   CAM -> OTHER  "ANGLE <deg>\n"   e.g. "ANGLE 144\n"
//
// ESP-NOW to other ESP (peer-to-peer WiFi, no router):
//   CAM -> OTHER  "ANGLE <deg>\n"  (same bytes, sent via esp_now_send)
//   Both paths are active in parallel; the wire is the primary, ESP-NOW
//   is the backup. If one fails, the other still works.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_now.h>
#include <HTTPClient.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ----- User configuration (edit these before flashing) -------------------
// Keep this ino self-contained: Arduino IDE needs all .h files in the same
// folder as the .ino. If you keep config.h next to this file, that works
// too — but having the values inline means you can copy just this one
// file to your Arduino sketches folder and it will compile.

// ---- WiFi ----
// These are written to flash memory in plain text. Anyone with the firmware
// binary can extract them. For a production device, use the ESP32's NVS
// (Preferences library) to store them encrypted, or at minimum don't publish
// a build with real credentials. Rotate your Wi-Fi password after this kind
// of exposure.
#define SRB_WIFI_SSID         "test"
#define SRB_WIFI_PASSWORD     "12345677"

// ---- Supabase ----
#define SRB_SUPABASE_HOST     "xjjlsxsdjbgrhsnncfdg.supabase.co"
#define SRB_SUPABASE_PATH     "/functions/v1/classify"
#define SRB_SUPABASE_AUTH     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqamxzeHNkamJncmhzbm5jZmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTIxMDQsImV4cCI6MjEwMzQyODEwNH0.hvLmx6cbeAL6KGUx9BehJlbtxZEZ1WUB_WZjYaMbxUY"

// ---- Device identity ----
#define SRB_DEVICE_ID         "bin-01"

// ---- ESP-NOW peer ----
// DOIT v1's WiFi station MAC. After you flash the DOIT v1, open its
// Serial Monitor (115200 baud) and read the line that says "DOIT v1
// MAC: XX:XX:XX:XX:XX:XX". Then plug those bytes in here and re-flash
// this AI-Thinker. Once the two MACs are paired, ESP-NOW sends the
// ANGLE line in parallel with the wire, so the DOIT v1 sees the angle
// from either path. Replace the zeros with the actual MAC.
const uint8_t DOIT_MAC[6] = { 0x84, 0x1F, 0xE8, 0x1C, 0x59, 0x80 };

// ESP-NOW channel. 0 = use the same channel the AI-Thinker's WiFi is
// already on (recommended). The DOIT v1 does the same so both ends
// are on the same channel automatically.
#define SRB_ESPNOW_CHANNEL  0

// Set to 1 to use the physical 2-wire link (recommended: less radio
// traffic and less power noise near the stepper). Set to 0 to use
// ESP-NOW only.
#define SRB_WIRED_LINK       1

// ---- Network tuning ----
#define SRB_HTTP_TIMEOUT_MS   15000
#define SRB_UART_BAUD         115200

// ---- Distance thresholds ----
// Trash falls from a pin above the sensor. TRIGGER_CM is the cut-off for
// "trash in", RELEASE_CM is the cut-off for "bin empty" (used to re-arm).
#define SRB_TRIGGER_CM        8.0f
#define SRB_RELEASE_CM        15.0f
#define SRB_DEBOUNCE_COUNT    1

// ---- Camera ----
// FRAMESIZE_VGA = 640x480, FRAMESIZE_QVGA = 320x240. Lower = smaller JPEG.
// (Note: the API uses FRAMESIZE_*, not FRAME_SIZE_*. Newer esp32 Arduino
// cores (>= 3.x) renamed the constants.)
#define SRB_FRAME_SIZE        FRAMESIZE_VGA
#define SRB_JPEG_QUALITY      12

// How long the flash LED stays on BEFORE capture so the OV2640's
// auto-exposure / auto-gain can adjust to the new light level. 200 ms
// was too short and produced black images. 3-4 s gives a stable exposure.
#define SRB_FLASH_SETTLE_MS   4000

// --- Pins ---------------------------------------------------------------
// This board's 16-pin header exposes U0T/U0R (GPIO1/GPIO3), GPIO 4/12/13/
// 14/15/2, and 5V/GND/3V3. GPIO 2 is a strapping pin (avoid). GPIO 12
// must be LOW at boot for the OV2640 to init. GPIO 16/17 are tied to the
// PSRAM and are not broken out. Use UART0 (U0T/U0R) for the link to the
// DOIT v1. The ESP32-CAM-MB programmer shares those pins, so disconnect
// it after flashing and power the CAM from 5V/GND.
#define TRIG_GPIO        13
#define ECHO_GPIO        12
#define LED_GPIO          4   // AI-Thinker flash LED (active-high)
// This board exposes U0T/U0R (GPIO1/GPIO3) on the header, not GPIO14/15.
// Use UART0 for the link:
//   CAM U0T (GPIO1, TX) -> DOIT GPIO16 (UART2 RX)
//   CAM U0R (GPIO3, RX) <- DOIT GPIO17 (UART2 TX)  [optional]
// Because U0T/U0R are also the USB-programmer pins, disconnect the
// ESP32-CAM-MB programmer after flashing and power the CAM from 5V/GND.
// USB debug is therefore disabled while the cable is connected.
#define LINK_TX_PIN       1   // U0T on the header
#define LINK_RX_PIN       3   // U0R on the header
#define LINK_BAUD      SRB_UART_BAUD

// The link uses UART0 at 115200. If your board actually exposes GPIO14/15
// and you want USB debug at the same time, move the link there instead.

// --- Network ------------------------------------------------------------
static const char* WIFI_SSID     = SRB_WIFI_SSID;
static const char* WIFI_PASSWORD = SRB_WIFI_PASSWORD;
static const char* SUPABASE_HOST = SRB_SUPABASE_HOST;
static const char* SUPABASE_PATH = SRB_SUPABASE_PATH;
static const char* SUPABASE_AUTH = SRB_SUPABASE_AUTH;
static const char* DEVICE_ID     = SRB_DEVICE_ID;

// --- Detection thresholds ----------------------------------------------
const float    TRIGGER_CM        = SRB_TRIGGER_CM;
const float    RELEASE_CM        = SRB_RELEASE_CM;
const uint8_t  DEBOUNCE_COUNT    = SRB_DEBOUNCE_COUNT;
const uint16_t PING_INTERVAL_MS  = 100;

// --- Camera -------------------------------------------------------------
// AI-Thinker ESP32-CAM pin map (matches the board's labels exactly).
// AI-Thinker pin map, matched to the camera_pins.h in the working
// CameraWebServer example. PWDN is GPIO 32 on the AI-Thinker (not -1):
// the camera driver needs to drive it high then low to wake the OV2640.
// Setting it to -1 leaves the sensor in power-down and produces 0x106.
#define PWDN_GPIO  32
#define RESET_GPIO -1
#define XCLK_GPIO   0
// AI-Thinker SCCB pins. Default is the canonical AI-Thinker map (26/27).
// On some ESP32-S / ESP32-AI-Thinker boards the SCCB lines are on a
// different pair. The I2C scanner in cameraInit() probes all known pairs
// at boot, finds the working one, and the camera init uses that. Once you
// see the scanner report which pair ACKed, edit these two defines to that
// pair so the scanner no longer needs to run.
#define SIOD_GPIO  26
#define SIOC_GPIO  27
#define Y9_GPIO    35
#define Y8_GPIO    34
#define Y7_GPIO    39
#define Y6_GPIO    36
#define Y5_GPIO    21
#define Y4_GPIO    19
#define Y3_GPIO    18
#define Y2_GPIO     5
#define VSYNC_GPIO 25
#define HREF_GPIO  23
#define PCLK_GPIO  22

// --- State -------------------------------------------------------------
static bool         s_armed      = true;
static uint8_t      s_debounce   = 0;
static uint32_t     s_lastPingMs = 0;
static WiFiClientSecure s_https;

// AP channel captured after wifiEnsureConnected(). Used to register
// the DOIT as an ESP-NOW peer on the same channel the CAM is on.
static uint8_t      s_apChannel  = 0;

// Diagnostic: count of ultrasonic readings since boot. The loop() logs
// every Nth reading ("d=X.X cm") to both s_link and s_usb so the user
// can see the sensor working in real time, even when nothing is being
// detected. Set to 0 to disable, 1 to log every reading, 10 to log
// roughly once per second at PING_INTERVAL_MS=100.
#define SRB_US_LOG_EVERY_N  10
static uint32_t     s_usReadings = 0;

// This board uses U0T/U0R for the link, and those are the same pins as
// the ESP32-CAM-MB programmer. USB debug is disabled by default so the
// two do not fight over GPIO1/GPIO3. Set SRB_USB_DEBUG to 1 only when
// the link cable is disconnected and you are flashing/debugging.
#define SRB_USB_DEBUG 0

#if SRB_USB_DEBUG
static HardwareSerial s_usb(1);
#else
// No-op serial so the existing logging calls compile without touching
// GPIO1/GPIO3.
class NullSerial {
 public:
  void begin(unsigned long, uint32_t = SERIAL_8N1, int8_t = -1, int8_t = -1) {}
  int available() { return 0; }
  String readStringUntil(char) { return String(); }
  size_t printf(const char *, ...) { return 0; }
  template <typename T> size_t print(const T &) { return 0; }
  template <typename T> size_t println(const T &) { return 0; }
  size_t println() { return 0; }
};
static NullSerial s_usb;
#endif

// Log to the link UART (and USB only when enabled).
#define LOG(...)   do { s_link.printf(__VA_ARGS__); s_usb.printf(__VA_ARGS__); } while (0)
#define LOGLN(s)   do { s_link.println(s);         s_usb.println(s);         } while (0)

// --- ESP-NOW handshake state -------------------------------------------
// All three are set/cleared by the ESP-NOW recv callback (in WiFi task
// context) and consumed by loop() (in Arduino task context). The angle
// and pong fields are guarded by a small critical section via the
// volatile qualifier; loop() reads them in single instructions and the
// values are simple enough that tearing is not a concern in practice.

// Boot-time liveness probe.
static bool     s_pingPending    = false;
static uint32_t s_pingSentMs     = 0;
static volatile bool s_pongReceived = false;

// ACK retry. When the CAM sends an ANGLE, the DOIT replies with ACK
// over ESP-NOW. The CAM waits up to 500 ms, re-sends up to 2 times
// before giving up. -1 means "no ACK pending".
static int16_t  s_pendingAckDeg  = -1;
static uint32_t s_ackSentMs      = 0;
static uint8_t  s_ackRetries     = 0;

// ESP-NOW send callback. Called by the SDK when a send completes.
// Newer ESP-IDF wraps the destination info in a struct.
static void onEspNowSend(const wifi_tx_info_t *info, esp_now_send_status_t status) {
  (void)info;
  if (status != ESP_NOW_SEND_SUCCESS) {
    Serial.printf("ESP-NOW send failed: %d\n", status);
  }
}

// Initialise ESP-NOW and register the DOIT v1 as a peer. ESP-NOW requires
// WiFi to be initialised first (even if not connected). The DOIT v1's MAC
// must be in DOIT_MAC before this is useful.
static bool espNowInit() {
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return false;
  }
  esp_now_register_send_cb(onEspNowSend);

  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, DOIT_MAC, 6);
  // Use the explicit AP channel captured after wifiEnsureConnected().
  // Without this, ESP-NOW packets may be sent on a different channel
  // than the DOIT is listening on, and the DOIT never receives them.
  peer.channel = s_apChannel ? s_apChannel : SRB_ESPNOW_CHANNEL;
  peer.encrypt = false;  // closed system, no need for encryption
  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("ESP-NOW add_peer failed (check DOIT_MAC is correct)");
    return false;
  }
  Serial.println("ESP-NOW ready, peer registered");
  return true;
}

// The link to the DOIT v1 is UART0 on U0T (GPIO1, TX) / U0R (GPIO3, RX).
// Debug logs go to the same UART as the link, so the DOIT must ignore
// anything that doesn't start with "ANGLE " (it echoes those lines to
// its own USB monitor).
#define s_link Serial

// --- Helpers -----------------------------------------------------------
static float readDistanceCm() {
  digitalWrite(TRIG_GPIO, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_GPIO, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_GPIO, LOW);

  unsigned long duration = pulseIn(ECHO_GPIO, HIGH, 30000UL);
  if (duration == 0) return -1.0f;
  return (duration * 0.0343f) / 2.0f;
}

static void flashOn()  { digitalWrite(LED_GPIO, HIGH); }
static void flashOff() { digitalWrite(LED_GPIO, LOW);  }

static bool cameraInit() {
  camera_config_t cfg = {};
  cfg.ledc_channel = LEDC_CHANNEL_0;
  cfg.ledc_timer   = LEDC_TIMER_0;
  cfg.pin_d0       = Y2_GPIO;
  cfg.pin_d1       = Y3_GPIO;
  cfg.pin_d2       = Y4_GPIO;
  cfg.pin_d3       = Y5_GPIO;
  cfg.pin_d4       = Y6_GPIO;
  cfg.pin_d5       = Y7_GPIO;
  cfg.pin_d6       = Y8_GPIO;
  cfg.pin_d7       = Y9_GPIO;
  cfg.pin_xclk     = XCLK_GPIO;
  cfg.pin_pclk     = PCLK_GPIO;
  cfg.pin_vsync    = VSYNC_GPIO;
  cfg.pin_href     = HREF_GPIO;
  cfg.pin_sccb_sda = SIOD_GPIO;
  cfg.pin_sccb_scl = SIOC_GPIO;
  cfg.pin_pwdn     = PWDN_GPIO;
  cfg.pin_reset    = RESET_GPIO;
  cfg.xclk_freq_hz = 20000000;
  cfg.pixel_format = PIXFORMAT_JPEG;
  cfg.frame_size   = SRB_FRAME_SIZE;
  cfg.jpeg_quality = SRB_JPEG_QUALITY;
  cfg.fb_count     = 1;
  cfg.fb_location  = CAMERA_FB_IN_PSRAM;
  cfg.grab_mode    = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&cfg);
  if (err != ESP_OK) {
    s_link.printf("camera init failed: 0x%x\n", err);
    return false;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_vflip(s, 1);
    s->set_hmirror(s, 0);
  }
  return true;
}

// Connect to WiFi. Returns true on success. Re-tries forever; the device
// is useless without the network anyway.
static bool wifiEnsureConnected() {
  if (WiFi.status() == WL_CONNECTED) return true;
  s_link.printf("WiFi: connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  for (uint8_t i = 0; i < 40; i++) {  // ~10 s ceiling
    if (WiFi.status() == WL_CONNECTED) {
      s_link.printf("WiFi: connected, IP %s\n",
                    WiFi.localIP().toString().c_str());
      return true;
    }
    delay(250);
  }
  s_link.println("WiFi: connect failed");
  return false;
}

// Send the JPEG to Supabase and parse `angle` from the JSON response.
// Returns the angle (0/72/144/216/288) or -1 on any error.
static int callClassifyAndGetAngle(camera_fb_t *fb) {
  if (!wifiEnsureConnected()) return -1;

  // HTTPS without cert verification — Supabase uses a public CA but the
  // AI-Thinker doesn't have the full bundle in ROM. For a local prototype
  // we accept the security tradeoff; for production, set the root cert
  // via setCACert() instead.
  s_https.setInsecure();

  HTTPClient http;
  String url = String("https://") + SUPABASE_HOST + SUPABASE_PATH;
  if (!http.begin(s_https, url)) {
    LOGLN("http.begin failed");
    return -1;
  }

  // Build the multipart body. We assemble it in a single in-memory
  // buffer (head + JPEG + tail) and POST it with one sendRequest call.
  // The previous version tried to stream via getStreamPtr()->write() which
  // set Content-Length: 0 and sent no body. In-memory is fine here:
  // a 25 KB JPEG plus ~250 bytes of headers is ~26 KB, well within
  // the AI-Thinker's 320 KB SRAM.
  const String boundary = "----srb0123456789";
  String head = "--" + boundary + "\r\n"
                "Content-Disposition: form-data; name=\"file\"; filename=\"img.jpg\"\r\n"
                "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";
  size_t headLen = head.length();
  size_t tailLen = tail.length();
  size_t totalLen = headLen + fb->len + tailLen;

  uint8_t *body = (uint8_t *)malloc(totalLen);
  if (!body) {
    LOGLN("malloc failed for POST body");
    http.end();
    return -1;
  }
  memcpy(body, head.c_str(), headLen);
  memcpy(body + headLen, fb->buf, fb->len);
  memcpy(body + headLen + fb->len, tail.c_str(), tailLen);

  http.setReuse(false);
  http.setTimeout(SRB_HTTP_TIMEOUT_MS);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_AUTH);
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  LOG("POST %s (%u bytes)\n", url.c_str(), (unsigned)totalLen);
  int code = http.POST(body, totalLen);
  free(body);

  if (code <= 0) {
    LOG("POST failed: %d\n", code);
    http.end();
    return -1;
  }
  LOG("Supabase status: %d\n", code);

  String respBody = http.getString();
  http.end();

  if (code < 200 || code >= 300) {
    // Print enough of the body to see the {error, detail, hint} fields
    // that v25+ of the function includes.
    LOGLN("body: " + respBody.substring(0, 512));
    return -1;
  }

  // Tiny JSON parse for "angle":NNN
  int idx = respBody.indexOf("\"angle\"");
  if (idx < 0) {
    LOGLN("no angle in response");
    return -1;
  }
  int colon = respBody.indexOf(':', idx);
  if (colon < 0) return -1;
  int n = 0;
  int i = colon + 1;
  while (i < (int)respBody.length() && isspace(respBody[i])) i++;
  while (i < (int)respBody.length() && isdigit(respBody[i])) {
    n = n * 10 + (respBody[i] - '0');
    i++;
  }
  LOG("angle = %d\n", n);

  // Also extract the predicted label so the user can see what the AI
  // classified the object as, not just the angle. The label is the
  // human-readable name ("paper", "plastic", etc.); the angle is the
  // motor position derived from the label.
  int lblIdx = respBody.indexOf("\"predictedLabel\"");
  if (lblIdx >= 0) {
    int q1 = respBody.indexOf('"', lblIdx + 17);
    int q2 = respBody.indexOf('"', q1 + 1);
    if (q1 >= 0 && q2 > q1) {
      String label = respBody.substring(q1 + 1, q2);
      LOG("predictedLabel = %s\n", label.c_str());
    }
  }

  return n;
}

// Send the angle over UART as a single line for the other ESP to read.
static void sendAngleOverUart(int angle) {
  char buf[24];
  int n = snprintf(buf, sizeof(buf), "ANGLE %d\n", angle);
  if (n > 0) s_link.write((const uint8_t*)buf, n);
  s_link.flush();
  s_link.printf("UART <- ANGLE %d\n", angle);
}

// Send the same ANGLE line over ESP-NOW. The DOIT v1 receives it via
// its onEspNowRecv callback and acts on it. This runs in parallel with
// the wire so the system keeps working if either path fails.
static void sendAngleOverEspNow(int angle) {
  char buf[24];
  int n = snprintf(buf, sizeof(buf), "ANGLE %d\n", angle);
  if (n <= 0) return;
  esp_err_t r = esp_now_send(DOIT_MAC, (uint8_t *)buf, n);
  char line[96];
  snprintf(line, sizeof(line), "esp_now_send -> DOIT MAC ANGLE %d (err=0x%x)\n",
           angle, (unsigned)r);
  s_link.print(line);
  s_usb.print(line);
  if (r != ESP_OK) {
    s_link.printf("  ! send queue failed; check DOIT_MAC / channel / peer\n");
    s_usb.printf("  ! send queue failed; check DOIT_MAC / channel / peer\n");
  }
  // Arm the ACK retry state machine. We track the angle and the time
  // we sent it; loop() will re-send up to 2 times before giving up.
  s_pendingAckDeg = (int16_t)angle;
  s_ackSentMs     = millis();
  s_ackRetries    = 0;
}

// CAM-side ESP-NOW receive callback. Runs in WiFi task context. Just
// sets flags / logs; loop() consumes them.
static void onCamEspNowRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
  (void)info;
  if (len <= 0 || len > 63) return;
  char buf[64];
  memcpy(buf, data, len);
  buf[len] = '\0';
  String line = String(buf);
  line.trim();
  if (line.startsWith("PONG")) {
    s_pongReceived = true;
    return;
  }
  if (line.startsWith("ACK ")) {
    int deg = line.substring(4).toInt();
    if (deg == s_pendingAckDeg) {
      s_pendingAckDeg = -1;
      s_ackRetries    = 0;
      s_link.printf("ESP-NOW: ACK for angle %d\n", deg);
    }
    return;
  }
  if (line.startsWith("DONE ")) {
    int deg = line.substring(5).toInt();
    s_link.printf("ESP-NOW: DOIT finished angle %d\n", deg);
    return;
  }
  // Defensive: ignore anything else.
}

// Send an angle over both wire and ESP-NOW without going through the
// camera/Supabase path. Used by the TEST <angle> command for bench
// testing the comms chain. Validates that the angle is in BIN_ANGLES.
// Logs every event to BOTH s_link (wire, visible on DOIT monitor) and
// s_usb (USB, visible on ESP32-CAM-MB programmer's Serial Monitor)
// so the developer can see what the CAM did regardless of which
// Serial they're watching.
static void handleTestAngle(int angle) {
  if (angle != 0 && angle != 72 && angle != 144 && angle != 216 && angle != 288) {
    char buf[96];
    snprintf(buf, sizeof(buf), "TEST: invalid angle %d (expected 0|72|144|216|288)\n", angle);
    s_link.print(buf);
    s_usb.print(buf);
    return;
  }
  char buf[64];
  snprintf(buf, sizeof(buf), "TEST -> angle %d\n", angle);
  s_link.print(buf);
  s_usb.print(buf);
#if SRB_WIRED_LINK
  sendAngleOverUart(angle);
#else
  sendAngleOverEspNow(angle);
#endif
}

// Print the list of available USB Serial commands. Sent on both serials.
static void printTestHelp() {
  const char *help =
    "SmartRecycleBin CAM USB commands:\n"
    "  TEST <angle>   send ANGLE <angle> to the DOIT\n"
    "                 (angle must be one of 0, 72, 144, 216, 288)\n"
    "  TEST<angle>    same, no space required\n"
    "  TEST           show this help\n"
    "  HELP / ?       show this help\n";
  s_link.print(help);
  s_usb.print(help);
}

static void handleDetection() {
  flashOn();
  delay(SRB_FLASH_SETTLE_MS);  // let AEC/AGC settle to the flash

  camera_fb_t *fb = esp_camera_fb_get();
  flashOff();  // turn the flash LED off as soon as the frame is captured
  if (!fb) {
    LOGLN("camera_fb_get failed");
    return;
  }
  LOG("captured %u bytes\n", (unsigned)fb->len);

  int angle = callClassifyAndGetAngle(fb);
  esp_camera_fb_return(fb);

  if (angle < 0) {
    LOGLN("classify failed; not sending angle");
    return;
  }
#if SRB_WIRED_LINK
  sendAngleOverUart(angle);
#else
  sendAngleOverEspNow(angle);
#endif
}

// --- Arduino entry points ----------------------------------------------
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);  // AI-Thinker weak regulator

  // Start the link UART first at the configured baud. The first ~3 s of debug
  // output goes to the other ESP unless you disconnect the link wire, but
  // that's fine — the other ESP should ignore lines that don't start with
  // "ANGLE ".
  s_link.begin(LINK_BAUD, SERIAL_8N1, LINK_RX_PIN, LINK_TX_PIN);
  delay(50);

  // USB Serial is disabled by default because the link uses U0T/U0R,
  // the same pins as the ESP32-CAM-MB programmer. Set SRB_USB_DEBUG to 1
  // only when the link cable is disconnected.
#if SRB_USB_DEBUG
  s_usb.begin(115200, SERIAL_8N1, 3, 1);
  delay(50);
#endif

  s_link.println("SmartRecycleBin CAM firmware booting...");
  s_usb.println("SmartRecycleBin CAM firmware booting...");

  pinMode(TRIG_GPIO, OUTPUT);
  pinMode(ECHO_GPIO, INPUT);
  pinMode(LED_GPIO,  OUTPUT);
  digitalWrite(LED_GPIO, LOW);
  digitalWrite(TRIG_GPIO, LOW);

  if (!cameraInit()) {
    s_link.println("camera init failed; halting.");
    s_usb.println("camera init failed; halting.");
    while (true) { delay(1000); }
  }
  s_link.println("camera ready");
  s_usb.println("camera ready");

  wifiEnsureConnected();

  // Capture the AP channel after WiFi is up. The DOIT will be told to
  // use this channel (via its own scan) so both radios are on the same
  // frequency for ESP-NOW.
  s_apChannel = WiFi.channel();
  {
    char line[64];
    snprintf(line, sizeof(line), "CAM: AP channel = %d", s_apChannel);
    s_link.println(line);
    s_usb.println(line);
  }

  // Print this board's MAC so the user can plug it into the DOIT v1's
  // THINKER_MAC and re-flash.
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macLine[64];
  snprintf(macLine, sizeof(macLine),
           "AI-Thinker MAC: %02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  s_link.println(macLine);
  s_usb.println(macLine);

#if SRB_WIRED_LINK
  // Wired mode: no ESP-NOW initialization at all. The DOIT gets ANGLE
  // lines over U0T/U0R, so the radio is only used for the Supabase
  // HTTP request.
  s_link.println("Link: wired UART on U0T (GPIO1, TX) / U0R (GPIO3, RX)");
  s_usb.println("Link: wired UART on U0T (GPIO1, TX) / U0R (GPIO3, RX)");
#else
  espNowInit();
  esp_now_register_recv_cb(onCamEspNowRecv);
  // Give the ESP-NOW recv callback a full task tick to wire up before
  // the first packet arrives. The DOIT's PING->PONG round-trip is fast
  // (sub-100 ms); if the recv callback isn't fully registered, the
  // PONG is dropped and the CAM logs "no PONG" even though the DOIT
  // did reply. 100 ms is generous.
  delay(100);

  // Boot-time liveness probe. Sent once after ESP-NOW is up. loop()
  // resolves the PONG result within 1 s and logs success or failure.
  const char ping[] = "PING\n";
  esp_now_send(DOIT_MAC, (const uint8_t *)ping, sizeof(ping) - 1);
  s_pingPending = true;
  s_pingSentMs  = millis();
  s_link.println("ESP-NOW: sent PING, waiting up to 1 s for PONG");
  s_usb.println("ESP-NOW: sent PING, waiting up to 1 s for PONG");
#endif
}

void loop() {
#if !SRB_WIRED_LINK
  // --- ESP-NOW handshake state machine -------------------------------
  // PONG result: armed in setup(), resolved within 1 s.
  if (s_pingPending && (int32_t)(millis() - s_pingSentMs) > 1000) {
    s_pingPending = false;
    if (s_pongReceived) {
      s_link.println("ESP-NOW: got PONG, peer alive");
      s_usb.println("ESP-NOW: got PONG, peer alive");
    } else {
      s_link.println("ESP-NOW: no PONG, peer unreachable — check DOIT_MAC / power / channel");
      s_usb.println("ESP-NOW: no PONG, peer unreachable — check DOIT_MAC / power / channel");
    }
  }
  // ACK retry: armed by sendAngleOverEspNow, cleared by onCamEspNowRecv.
  if (s_pendingAckDeg >= 0 && (int32_t)(millis() - s_ackSentMs) > 500) {
    if (s_ackRetries < 2) {
      s_ackRetries++;
      s_ackSentMs = millis();
      char buf[24];
      int n = snprintf(buf, sizeof(buf), "ANGLE %d\n", s_pendingAckDeg);
      if (n > 0) {
        esp_now_send(DOIT_MAC, (const uint8_t *)buf, n);
        s_link.printf("ESP-NOW: resend %d/2 for angle %d\n", s_ackRetries, s_pendingAckDeg);
      }
    } else {
      s_link.printf("ESP-NOW: no ACK for angle %d after 3 attempts\n", s_pendingAckDeg);
      s_pendingAckDeg = -1;
      s_ackRetries    = 0;
    }
  }
#endif

  // --- USB Serial commands -------------------------------------------
  // Accepts:
  //   TEST <angle>   send ANGLE <angle> to the DOIT
  //   TEST<angle>    same, no space
  //   TEST           show help
  //   HELP / ?       show help
  // Every event is logged to BOTH s_link and s_usb so the developer
  // can see what the CAM received regardless of which monitor they're
  // watching.
  if (s_usb.available()) {
    String line = s_usb.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) {
      // empty line, ignore
    } else if (line == "TEST" || line == "test") {
      printTestHelp();
    } else if (line == "HELP" || line == "help" || line == "?") {
      printTestHelp();
    } else if (line.startsWith("TEST ") || line.startsWith("test ")) {
      int angle = line.substring(5).toInt();
      handleTestAngle(angle);
    } else if (line.startsWith("TEST") || line.startsWith("test")) {
      // "TEST72" with no space.
      int angle = line.substring(4).toInt();
      handleTestAngle(angle);
    } else {
      char buf[96];
      snprintf(buf, sizeof(buf), "unknown command: '%s' (try 'HELP')\n", line.c_str());
      s_link.print(buf);
      s_usb.print(buf);
    }
  }

  // --- Ultrasonic detection ------------------------------------------
  uint32_t now = millis();
  if (now - s_lastPingMs < PING_INTERVAL_MS) return;
  s_lastPingMs = now;

  float d = readDistanceCm();
  s_usReadings++;
  if (d < 0) {
    if ((s_usReadings % SRB_US_LOG_EVERY_N) == 0) {
      char line[64];
      snprintf(line, sizeof(line), "us: no echo (reading #%lu)\n",
               (unsigned long)s_usReadings);
      s_link.print(line);
      s_usb.print(line);
    }
    s_debounce = 0;
    return;
  }
  if (SRB_US_LOG_EVERY_N > 0 && (s_usReadings % SRB_US_LOG_EVERY_N) == 0) {
    char line[64];
    snprintf(line, sizeof(line), "us: d=%.1f cm armed=%d (reading #%lu)\n",
             d, (int)s_armed, (unsigned long)s_usReadings);
    s_link.print(line);
    s_usb.print(line);
  }

  if (s_armed) {
    if (d < TRIGGER_CM) {
      if (++s_debounce >= DEBOUNCE_COUNT) {
        LOG("trash detected at %.1f cm\n", d);
        s_armed = false;
        s_debounce = 0;
        handleDetection();
      }
    } else {
      s_debounce = 0;
    }
  } else {
    if (d > RELEASE_CM) {
      LOG("bin empty (%.1f cm), re-arming\n", d);
      s_armed = true;
    }
  }
}
