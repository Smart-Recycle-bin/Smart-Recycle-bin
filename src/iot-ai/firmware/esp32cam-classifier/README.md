# ESP32-CAM (AI-Thinker) firmware

Sketches for the **camera side** of the SmartRecycleBin, written for the
Makers Electronics "ESP32 CAM ESP32-S WIFI+BLUETOOTH With OV2640 Camera
Module" (an AI-Thinker ESP32-CAM board). The CAM detects trash, takes a
photo, POSTs it to the SmartBin ASP.NET Core backend (`/api/v1/bins/{binId}/items`)
where the embedded ML.NET model evaluates it for whichever user currently holds
the bin lock (without needing a `sessionId` on the ESP32), parses the returned
`angle`, and forwards it to the second ESP over UART.

## What it does

1. Polls an HC-SR04 ultrasonic sensor every 100 ms.
2. When the distance stays under `SRB_TRIGGER_CM` (default 8 cm) for
   `SRB_DEBOUNCE_COUNT` (default 1) consecutive readings, it treats it as
   "trash detected".
3. Turns on the on-board flash LED, captures one VGA JPEG from the OV2640.
4. POSTs the JPEG (`image` form field + `X-Device-Key` header, no `sessionId`) to `/api/v1/bins/{binId}/items` over WiFi.
5. Backend resolves the active QR session user, classifies via ML.NET (`MLModel.mlnet`), extends the 60s inactivity window, and returns `{ wasteType, predictedLabel, angle }`. If no user has locked the bin (`409 NO_ACTIVE_SESSION`), the bin logs it and stays idle.
6. Sends `ANGLE <deg>` (`0|72|144|216|288`) to the DOIT ESP32 over UART / ESP-NOW.
7. Turns the LED off, waits for the bin to be empty (distance > `SRB_RELEASE_CM`), then re-arms.

## Wiring (AI-Thinker 16-pin through-hole header)

| AI-Thinker pin | Header pin # | Net name      | Used for            |
| -------------- | ------------ | ------------- | ------------------- |
| 5V             | 1, 10        | 5V            | HC-SR04 VCC, link   |
| GND            | 9, 13        | GND           | everything          |
| **GPIO 14**    | **5**        | (was free)    | **link TX** (send ANGLE) |
| **GPIO 15**    | **6**        | (was free/SD) | **link RX** (receive from DOIT) |
| GPIO 2         | 7            | (strapping)   | **leave unconnected** |
| GPIO 4         | 8            | Flash LED     | driven by this code |
| GPIO 12        | 3            | (boot strapping) | HC-SR04 ECHO via 4.7k+10k divider |
| GPIO 13        | 4            |               | HC-SR04 TRIG        |
| 3V3            | 14           | 3V3           | (regulator is weak, see power note) |

**Note on link pins:** the link to the DOIT v1 uses **GPIO 14 (TX) and GPIO 15 (RX)**, not GPIO 1/3. GPIO 1/3 are shared with the ESP32-CAM-MB programmer's USB-Serial bridge. With both the link wire and the programmer connected, the programmer's TXD and the AI-Thinker's TX would fight each other on GPIO 1, causing corrupted bytes. Moving the link to GPIO 14/15 eliminates this entirely.

Connections:

```
HC-SR04 VCC   -> 5V rail (red)
HC-SR04 GND   -> GND rail (black)
HC-SR04 TRIG  -> GPIO 13
HC-SR04 ECHO  -> voltage divider midpoint -> GPIO 12
                 (4.7k between ECHO and divider mid; 10k between mid and GND)

CAM GPIO 14 (header pin 5) -> OTHER ESP U0R (GPIO 3)
CAM GPIO 15 (header pin 6) -> OTHER ESP U0T (GPIO 1)
5V  -> 5V  (shared)
GND -> GND (shared)
```
```

### Voltage divider math (5V echo -> 3.3V GPIO)

```
ECHO --[ 4.7k ]--*--[ 10k ]-- GND
                  |
                  +---- GPIO 12
```

`Vout = 5V * 10k / (4.7k + 10k) = 5V * 0.68 = 3.4V` — slightly above 3.3V but
within the AI-Thinker's tolerance. If you want a stricter divider, use
`5.1k + 10k` for ~3.31V.

### AI-Thinker gotchas

- **GPIO 2** is a strapping pin. Do **not** connect anything to it (no
  HC-SR04 trigger, no link wire). Connecting it HIGH at boot can stop the
  ESP32 from booting normally.
- **GPIO 12** must be LOW at boot for the OV2640 to initialize. The
  4.7k+10k voltage divider keeps GPIO 12 pulled to ~0V through the 10k
  pull-down, but if the HC-SR04 is wired wrong (e.g. you swap TRIG and
  ECHO) the divider is on the wrong side. If `camera init failed: 0x...`
  appears in the logs, power-cycle the board with **no wires** on GPIO 12,
  then attach the divider.
- **microSD slot** uses GPIO 2/4/12/13/14/15. If you put an SD card in
  the slot, the camera init can fail because the SD driver shares pins
  with the camera. Leave the slot empty for now.
- **Power**: 5V at ~250 mA average, peaks at 310 mA when the flash LED
  is on. The board's onboard 3V3 regulator is weak; power from a beefy 5V
  supply (≥1 A), not a USB port. If the brownout detector keeps tripping,
  `WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0)` is already in `setup()` to
  disable it.

## UART protocol to the other ESP

115200 bps, 8N1. The link is on **GPIO 14 (TX) / GPIO 15 (RX)** on the
AI-Thinker, not GPIO 1/3. GPIO 1/3 are the AI-Thinker's USB-Serial
channel (the ESP32-CAM-MB programmer connects there). Keeping the link
off GPIO 1/3 means the USB-Serial and the link can be used at the
same time without bus contention.

Line-oriented ASCII. The CAM writes one line per detection:

```
ANGLE <deg>\n
```

where `<deg>` is one of `0`, `72`, `144`, `216`, `288` (the five bin slots
the Supabase `classify` function returns). Any other line is a debug log
and should be ignored by the other ESP.

Suggested handler on the other ESP:

```c
// on the other board, in loop()
if (Serial.available()) {
  String line = Serial.readStringUntil('\n');
  if (line.startsWith("ANGLE ")) {
    int deg = line.substring(6).toInt();
    // ... do whatever ...
  }
}
```

## Build & flash

1. Arduino IDE -> Boards Manager -> install **esp32 by Espressif** (≥ 3.0).
2. Tools -> Board -> **AI Thinker ESP32-CAM**.
3. Tools -> Partition Scheme -> **Huge APP (3MB No OTA / 1MB SPIFFS)**.
4. Open `esp32cam-classifier.ino` in Arduino IDE. The ino is **self-contained**
   — all configuration constants live at the top of the file. Edit:
   - `SRB_WIFI_SSID` and `SRB_WIFI_PASSWORD` for your network.
   - `SRB_DEVICE_ID` to a unique id (e.g. `bin-01`).
   - `SRB_SUPABASE_AUTH` is pre-filled with the project anon key.
5. Plug the AI-Thinker into USB with an FTDI/USB-UART adapter
   (GPIO 1 = TX, GPIO 3 = RX, GND, 5V). The link wire is on GPIO 14/15,
   so it doesn't conflict with the USB-Serial — you can keep both
   connected. (If you also want USB debug, see the note above about
   why we moved off GPIO 1/3.)
6. Hold the BOOT button, click Upload, release BOOT once "Connecting..."
   appears.
7. Open Serial Monitor at 115200. You should see:

   ```
   SmartRecycleBin CAM firmware booting...
   camera ready
   WiFi: connecting to ...
   WiFi: connected, IP 10.x.x.x
   ```

## Tuning the thresholds

`SRB_*` defines at the top of the ino:

```cpp
#define SRB_TRIGGER_CM    8.0f
#define SRB_RELEASE_CM    15.0f
#define SRB_DEBOUNCE_COUNT 1
#define SRB_FRAME_SIZE    FRAMESIZE_VGA
#define SRB_JPEG_QUALITY  12
```

- **Trigger / release hysteresis** (8 / 15 cm): the camera is mounted
  above the bin looking down. Trash drops from a pin, so it crosses the
  trigger cone in well under one ping interval. `TRIGGER_CM = 8` only
  fires when something is directly in front of the sensor.
  `RELEASE_CM = 15` is the empty-bin threshold.
- **Debounce = 1**: a single reading below the threshold fires. Increase
  to 2 or 3 if you see false triggers from insects / dust / air currents.
- **Frame size / quality**: lower these for smaller Supabase payloads
  (faster upload) at the cost of accuracy. 320x240 at quality 12 ≈ 8 KB;
  640x480 at quality 12 ≈ 25 KB.

## Serial Monitor output

- `trash detected at X.X cm` — trigger fires
- `captured N bytes` — after `esp_camera_fb_get()`
- `POST https://.../classify (N bytes)` — starting Supabase call
- `Supabase status: 200` — got a response
- `angle = 72` — parsed from the response
- `UART <- ANGLE 72` — sent to other ESP
- `bin empty (X.X cm), re-arming` — after the release threshold is crossed
- `camera init failed: 0x...` — usually GPIO 12 is HIGH at boot; the LED
  on the AI-Thinker can prevent boot, so power-cycle the board without
  any wires on GPIO 12 first, then attach the divider.

## Files

- `esp32cam-classifier.ino` — main sketch (self-contained, all config inline)
