// SmartRecycleBin CAM firmware — configuration.
//
// Configured to upload captured item photos directly to the SmartBin ASP.NET
// backend by Bin ID / QR Code (no sessionId needed on the microcontroller).

#ifndef SRB_CONFIG_H
#define SRB_CONFIG_H

// ----- WiFi -------------------------------------------------------------
#ifndef SRB_WIFI_SSID
#define SRB_WIFI_SSID         "test"
#endif
#ifndef SRB_WIFI_PASSWORD
#define SRB_WIFI_PASSWORD     "12345677"
#endif

// ----- SmartBin Backend API ---------------------------------------------
// Set SRB_API_HOST to the LAN IP of the machine running SmartBin ASP.NET Core.
// Endpoint called: POST /api/v1/bins/<SRB_BIN_ID>/items
#ifndef SRB_USE_HTTPS
#define SRB_USE_HTTPS         1
#endif
#ifndef SRB_API_HOST
#define SRB_API_HOST          "lacewing-exotic-elf.ngrok-free.app"
#endif
#ifndef SRB_API_PORT
#define SRB_API_PORT          443
#endif

// ----- Device & Bin Identity --------------------------------------------
// Must match SMART_BIN.QRCode, SerialNumber, or numeric BinId in SmartBin DB.
// Sent in the URL without any sessionId; backend resolves the active locked user.
#ifndef SRB_BIN_ID
#define SRB_BIN_ID            "BIN-101"
#endif
#ifndef SRB_DEVICE_KEY
#define SRB_DEVICE_KEY        "device-secret"
#endif

// ----- HTTP timeout (ms) -----------------------------------------------
#ifndef SRB_HTTP_TIMEOUT_MS
#define SRB_HTTP_TIMEOUT_MS   15000
#endif

// ----- Distance thresholds (cm) ---------------------------------------
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

#ifndef SRB_FRAME_SIZE
#define SRB_FRAME_SIZE        FRAMESIZE_VGA
#endif

#ifndef SRB_JPEG_QUALITY
#define SRB_JPEG_QUALITY      12
#endif

#endif // SRB_CONFIG_H
