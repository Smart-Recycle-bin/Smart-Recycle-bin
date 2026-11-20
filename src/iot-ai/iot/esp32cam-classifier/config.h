// SmartRecycleBin CAM firmware — configuration.
//
// All values can be overridden by defining them as build flags or by
// creating a `local_config.h` that defines them first and is included by
// the build system. Otherwise the defaults below are used.

#ifndef SRB_CONFIG_H
#define SRB_CONFIG_H

// ----- WiFi -------------------------------------------------------------
// REQUIRED. Override these in build flags or local_config.h.
#ifndef SRB_WIFI_SSID
#define SRB_WIFI_SSID         "test"
#endif
#ifndef SRB_WIFI_PASSWORD
#define SRB_WIFI_PASSWORD     "12345677"
#endif

// ----- Supabase --------------------------------------------------------
// Project URL is xjjlsxsdjbgrhsnncfdg.supabase.co; the function lives at
// /functions/v1/classify. The auth is the project anon key (or any other
// valid JWT; the function does its own authorization with the service
// role).
#ifndef SRB_SUPABASE_HOST
#define SRB_SUPABASE_HOST     "xjjlsxsdjbgrhsnncfdg.supabase.co"
#endif
#ifndef SRB_SUPABASE_PATH
#define SRB_SUPABASE_PATH     "/functions/v1/classify"
#endif
#ifndef SRB_SUPABASE_AUTH
#define SRB_SUPABASE_AUTH     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqamxzeHNkamJncmhzbm5jZmRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTIxMDQsImV4cCI6MjEwMzQyODEwNH0.hvLmx6cbeAL6KGUx9BehJlbtxZEZ1WUB_WZjYaMbxUY"
#endif

// ----- Device identity -------------------------------------------------
// Sent as the X-Device-Id header; also becomes the path prefix
// predictions/<device_id>/<uuid>_<name> in the storage bucket.
#ifndef SRB_DEVICE_ID
#define SRB_DEVICE_ID         "bin-01"
#endif

// ----- HTTP timeout (ms) -----------------------------------------------
#ifndef SRB_HTTP_TIMEOUT_MS
#define SRB_HTTP_TIMEOUT_MS   15000
#endif

// ----- Distance thresholds (cm) ---------------------------------------
// Trash falls from a pin above the sensor, not a hand reaching in. The
// object is in the cone for <100 ms so we want a single reading below the
// threshold to fire (DEBOUNCE_COUNT = 1).
#ifndef SRB_TRIGGER_CM
#define SRB_TRIGGER_CM        8.0f
#endif

#ifndef SRB_RELEASE_CM
#define SRB_RELEASE_CM        15.0f
#endif

#ifndef SRB_DEBOUNCE_COUNT
#define SRB_DEBOUNCE_COUNT     1
#endif

// ----- Camera / UART ---------------------------------------------------
#ifndef SRB_UART_BAUD
#define SRB_UART_BAUD         115200
#endif

// Frame size: FRAMESIZE_VGA (640x480) keeps JPEGs under 64 KB so they fit in
// a single 16-bit-length frame. Use FRAMESIZE_QVGA (320x240) if you want to
// halve the size at the cost of resolution.
#ifndef SRB_FRAME_SIZE
#define SRB_FRAME_SIZE        FRAMESIZE_VGA
#endif

#ifndef SRB_JPEG_QUALITY
#define SRB_JPEG_QUALITY      12
#endif

#endif // SRB_CONFIG_H
