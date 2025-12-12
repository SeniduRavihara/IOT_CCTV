#include "esp_camera.h"
#include <WiFi.h>
#include <WebSocketsServer.h>
#include "HTTPClient.h"
#include "soc/soc.h"           // Disable brownout problems
#include "soc/rtc_cntl_reg.h"  // Disable brownout problems

// ==========================================
// 1. NETWORK CONFIGURATION
// ==========================================
const char* ssid = "HUAWEI nova 3i";
const char* password = "senidu1234";
const char* server_url = "http://192.168.43.243:5001/detect"; // Backend URL

// ==========================================
// 2. CAMERA PINS (AI THINKER)
// ==========================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM       5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ==========================================
// 3. SERVO CONFIGURATION
// ==========================================
#define SERVO_PAN_PIN 12
#define SERVO_TILT_PIN 13
#define PWM_FREQ 50
#define PWM_RES 16
#define SERVO_MIN_US 500
#define SERVO_MAX_US 2400
#define SERVO_MIN_DUTY (int)((SERVO_MIN_US * 65536.0) / 20000.0)
#define SERVO_MAX_DUTY (int)((SERVO_MAX_US * 65536.0) / 20000.0)
#define FLASH_GPIO_NUM 4

// ==========================================
// 4. WEBSOCKET SERVER
// ==========================================
WebSocketsServer webSocket = WebSocketsServer(81); // WebSocket on port 81

// Motion detection variables
unsigned long last_motion_time = 0;
const unsigned long MOTION_INTERVAL = 3000; // Send frame every 3 seconds max
unsigned long last_stream_time = 0;
const unsigned long STREAM_INTERVAL = 200;  // ~5 FPS for WebSocket (slower to prevent buffer overflow)
unsigned long last_keepalive_time = 0;
const unsigned long KEEPALIVE_INTERVAL = 10000; // Send ping every 10 seconds
bool aiDetectionEnabled = true; // Toggle AI detection on/off

// Servo channel assignments
int panChannel = 0;
int tiltChannel = 1;

// Memory monitoring
unsigned long last_heap_check = 0;
const unsigned long HEAP_CHECK_INTERVAL = 30000; // Check every 30 seconds

void setServoAngle(int channel, int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  int duty = map(angle, 0, 180, SERVO_MIN_DUTY, SERVO_MAX_DUTY);
  ledcWrite(channel, duty);
}

// ==========================================
// 5. WEBSOCKET EVENT HANDLER
// ==========================================
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;
      
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      }
      break;
      
    case WStype_TEXT:
      {
        // Handle servo control commands (JSON format: {"pan":90,"tilt":45,"led":1})
        String cmd = String((char*)payload);
        Serial.printf("[%u] Received: %s\n", num, cmd.c_str());
        
        // Parse simple commands (you can use ArduinoJson for more complex parsing)
        if (cmd.startsWith("pan:")) {
          int angle = cmd.substring(4).toInt();
          setServoAngle(panChannel, angle);
          Serial.printf("✓ Pan: %d\n", angle);
        }
        else if (cmd.startsWith("tilt:")) {
          int angle = cmd.substring(5).toInt();
          setServoAngle(tiltChannel, angle);
          Serial.printf("✓ Tilt: %d\n", angle);
        }
        else if (cmd.startsWith("led:")) {
          int val = cmd.substring(4).toInt();
          digitalWrite(FLASH_GPIO_NUM, val > 0 ? HIGH : LOW);
          Serial.printf("✓ LED: %d\n", val);
        }
        else if (cmd.startsWith("ai:")) {
          int val = cmd.substring(3).toInt();
          aiDetectionEnabled = (val > 0);
          Serial.printf("✓ AI Detection: %s\n", aiDetectionEnabled ? "ENABLED" : "DISABLED");
        }
      }
      break;
      
    case WStype_BIN:
      Serial.printf("[%u] Binary data received (unexpected)\n", num);
      break;
  }
}

// ==========================================
// 6. MOTION DETECTION & BACKEND UPLOAD
// ==========================================
void sendFrameToBackend(camera_fb_t *fb) {
  if (!fb || fb->len == 0) {
    Serial.println("❌ Invalid frame");
    return;
  }

  unsigned long now = millis();
  if (now - last_motion_time < MOTION_INTERVAL) {
    return; // Throttle uploads
  }

  HTTPClient http;
  http.begin(server_url);
  http.addHeader("Content-Type", "image/jpeg");
  http.setTimeout(8000);  // Increased timeout for DeepFace processing
  http.setReuse(false);   // Don't reuse connection - fresh each time

  // Retry logic: Try 2 times before giving up
  int maxRetries = 2;
  int httpResponseCode = -1;
  
  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    httpResponseCode = http.POST(fb->buf, fb->len);
    
    if (httpResponseCode == 200) {
      Serial.printf("✅ Backend: %d (%.1f KB)\n", httpResponseCode, fb->len / 1024.0);
      last_motion_time = now;
      break; // Success!
    } else if (httpResponseCode > 0) {
      // Server responded but with error (400, 500, etc)
      Serial.printf("⚠️  Backend returned %d (attempt %d/%d)\n", httpResponseCode, attempt, maxRetries);
      if (attempt < maxRetries) delay(500); // Wait before retry
    } else {
      // Network error (-1 = connection failed, -11 = timeout)
      Serial.printf("⚠️  Backend error: %s (attempt %d/%d)\n", 
                    http.errorToString(httpResponseCode).c_str(), attempt, maxRetries);
      if (attempt < maxRetries) delay(1000); // Longer wait for network issues
    }
  }

  // If all retries failed, just log and continue (don't crash)
  if (httpResponseCode != 200) {
    Serial.println("❌ Backend unreachable - skipping this frame (will retry in 3s)");
  }

  http.end();
}

// ==========================================
// 7. CAMERA INITIALIZATION
// ==========================================
void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_CIF;   // 400x296 - smaller for faster network transmission
  config.jpeg_quality = 20;            // 10-63 lower=higher quality (20 = good balance)
  config.fb_count = 2;                 // Double buffer to prevent frame drops

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed: 0x%x\n", err);
    return;
  }
  Serial.println("✅ Camera initialized (VGA 640x480 for AI detection)");

  // Adjust sensor settings
  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);     // -2 to 2
  s->set_contrast(s, 0);       // -2 to 2
  s->set_saturation(s, 0);     // -2 to 2
  s->set_whitebal(s, 1);       // 0 = disable , 1 = enable
  s->set_awb_gain(s, 1);       // 0 = disable , 1 = enable
  s->set_wb_mode(s, 0);        // 0 to 4 - if awb_gain enabled
  s->set_exposure_ctrl(s, 1);  // 0 = disable , 1 = enable
  s->set_aec2(s, 0);           // 0 = disable , 1 = enable
  s->set_gain_ctrl(s, 1);      // 0 = disable , 1 = enable
  s->set_agc_gain(s, 0);       // 0 to 30
  s->set_gainceiling(s, (gainceiling_t)0);  // 0 to 6
  s->set_bpc(s, 0);            // 0 = disable , 1 = enable
  s->set_wpc(s, 1);            // 0 = disable , 1 = enable
  s->set_raw_gma(s, 1);        // 0 = disable , 1 = enable
  s->set_lenc(s, 1);           // 0 = disable , 1 = enable
  s->set_hmirror(s, 0);        // 0 = disable , 1 = enable
  s->set_vflip(s, 0);          // 0 = disable , 1 = enable
  
  Serial.println("✅ Camera configured: VGA quality for AI, will downscale for streaming");
}

// ==========================================
// 8. SETUP
// ==========================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  
  Serial.begin(115200);
  Serial.println("\n\n🚀 ESP32-CAM WebSocket Starting...");

  // Setup servo PWM (Arduino ESP32 v3.x API)
  // Note: ledcAttach returns the channel number
  panChannel = ledcAttach(SERVO_PAN_PIN, PWM_FREQ, PWM_RES);
  tiltChannel = ledcAttach(SERVO_TILT_PIN, PWM_FREQ, PWM_RES);
  
  Serial.printf("Pan channel: %d, Tilt channel: %d\n", panChannel, tiltChannel);
  
  // Center servos
  setServoAngle(panChannel, 90);
  setServoAngle(tiltChannel, 90);

  // Flash LED
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("✅ WiFi connected: %s\n", WiFi.localIP().toString().c_str());

  // Initialize camera
  setupCamera();

  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("✅ WebSocket server started on port 81");
  Serial.printf("📹 Stream URL: ws://%s:81\n", WiFi.localIP().toString().c_str());
}

// ==========================================
// 9. MAIN LOOP
// ==========================================
void loop() {
  // Check WiFi connection and reconnect if needed
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected! Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n✅ WiFi reconnected: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\n❌ WiFi reconnection failed - will retry next loop");
      delay(5000);
      return; // Skip this loop iteration
    }
  }

  // Handle WebSocket connections and messages
  webSocket.loop();

  unsigned long now = millis();
  
  // Memory monitoring - check heap every 30 seconds
  if (now - last_heap_check >= HEAP_CHECK_INTERVAL) {
    size_t free_heap = ESP.getFreeHeap();
    Serial.printf("💾 Free heap: %u bytes\n", free_heap);
    if (free_heap < 20000) {
      Serial.println("⚠️ WARNING: Low memory! Consider reducing frame rate or quality");
    }
    last_heap_check = now;
  }
  
  // Send keepalive ping every 10 seconds to prevent browser timeout
  if (webSocket.connectedClients() > 0 && (now - last_keepalive_time >= KEEPALIVE_INTERVAL)) {
    webSocket.sendTXT(0, "ping");  // Send to first client
    last_keepalive_time = now;
    Serial.println("Keepalive ping sent");
  }
  
  // WebSocket streaming (5 FPS) - AI detection DISABLED during live viewing
  if (webSocket.connectedClients() > 0 && (now - last_stream_time >= STREAM_INTERVAL)) {
    camera_fb_t * fb = esp_camera_fb_get();
    
    if (fb) {
      // Only send if frame size is reasonable (< 50KB to prevent buffer overflow)
      if (fb->len < 50000) {
        bool success = webSocket.broadcastBIN(fb->buf, fb->len);
        if (!success) {
          Serial.println("⚠️ WebSocket send failed - network too slow, skipping frame");
        }
      } else {
        Serial.printf("⚠️ Frame too large (%u KB), skipping\n", fb->len / 1024);
      }
      
      // ⚠️ AI DETECTION DISABLED WHILE STREAMING - Backend processing blocks live feed
      // Backend face detection only runs when NO clients watching (see else block below)
      
      esp_camera_fb_return(fb);
      last_stream_time = now;
    } else {
      Serial.println("Frame capture failed");
    }
  } 
  // No clients watching - ENABLE AI face detection (24/7 monitoring mode)
  else if (webSocket.connectedClients() == 0 && aiDetectionEnabled) {
    // Only try backend upload every 3 seconds (respects MOTION_INTERVAL throttling)
    if (now - last_motion_time >= MOTION_INTERVAL) {
      camera_fb_t * fb = esp_camera_fb_get();
      if (fb) {
        sendFrameToBackend(fb);
        esp_camera_fb_return(fb);
      }
    }
    delay(500); // Much slower when not streaming - saves power and reduces errors
  }
  else if (webSocket.connectedClients() == 0 && !aiDetectionEnabled) {
    delay(1000); // AI disabled and no clients - just idle
  }
  
  delay(10); // Small delay to prevent watchdog issues
}
