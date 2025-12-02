#include "esp_camera.h"
#include <WiFi.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "soc/soc.h"           // Disable brownout problems
#include "soc/rtc_cntl_reg.h"  // Disable brownout problems
#include "driver/rtc_io.h"
#include <HTTPClient.h>

// ==========================================
// 1. NETWORK CONFIGURATION (UPDATE THESE!)
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// REPLACE with your PC's IP Address (Run 'ipconfig' or 'ifconfig' on PC)
// Example: "192.168.1.15"
String serverName = "192.168.1.X"; 
int serverPort = 5001;
String serverPath = "/detect";

// ==========================================
// 2. CAMERA PINS (AI THINKER MODEL)
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
// 3. MOTION DETECTION SETTINGS
// ==========================================
#define MOTION_THRESHOLD 15   // Sensitivity (Lower = More Sensitive)
#define UPLOAD_INTERVAL 2000  // Minimum ms between uploads (Cooldown)

unsigned long lastUploadTime = 0;
uint8_t* prevFrame = nullptr;
size_t prevLen = 0;

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

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
  
  // Low quality for motion detection loop (faster)
  // We will switch to high quality for upload if possible, 
  // but for simplicity we keep it balanced here.
  config.frame_size = FRAMESIZE_QVGA; 
  config.jpeg_quality = 12;
  config.fb_count = 1;

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  // WiFi Connection
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("Camera Ready! IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  // --- Simple Motion Detection Logic ---
  // We compare the current JPEG size/bytes to the previous one.
  // Note: Comparing compressed JPEGs is not perfect for motion, 
  // but it's the lightest way on ESP32 without converting to RGB (heavy).
  // A significant change in JPEG size often indicates a scene change.
  
  bool motionDetected = false;
  
  if (prevFrame != nullptr) {
    // Simple check: If size changed significantly, something moved/changed focus
    long diff = abs((long)fb->len - (long)prevLen);
    if (diff > 1000) { // Threshold of byte difference
       motionDetected = true;
    }
  }

  // Store current frame as previous for next loop
  // (In a real app, you'd copy the buffer, but here we just track size for simplicity
  // to save RAM. For better detection, use a PIR sensor).
  prevLen = fb->len;

  // --- Upload if Motion Detected ---
  if (motionDetected && (millis() - lastUploadTime > UPLOAD_INTERVAL)) {
    Serial.println("Motion Detected! Uploading...");
    sendPhoto(fb);
    lastUploadTime = millis();
  }

  esp_camera_fb_return(fb);
  delay(100); // Small delay
}

String sendPhoto(camera_fb_t * fb) {
  String getAll;
  String status;

  HTTPClient http;
  String url = "http://" + serverName + ":" + String(serverPort) + serverPath;
  
  Serial.print("Posting to: ");
  Serial.println(url);

  http.begin(url);

  // Construct Multipart Form Data
  String head = "--RandomBoundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--RandomBoundary--\r\n";

  uint32_t imageLen = fb->len;
  uint32_t extraLen = head.length() + tail.length();
  uint32_t totalLen = imageLen + extraLen;

  http.addHeader("Content-Type", "multipart/form-data; boundary=RandomBoundary");
  http.addHeader("Content-Length", String(totalLen));

  // We need to send the data in chunks or stream it
  // But HTTPClient .POST with buffer is easiest for small images
  
  // Combine into one buffer (careful with RAM)
  // If this crashes, we need a more advanced streaming approach.
  uint8_t *buffer = (uint8_t *)malloc(totalLen);
  if (buffer) {
    memcpy(buffer, head.c_str(), head.length());
    memcpy(buffer + head.length(), fb->buf, imageLen);
    memcpy(buffer + head.length() + imageLen, tail.c_str(), tail.length());

    int httpResponseCode = http.POST(buffer, totalLen);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    free(buffer);
  } else {
    Serial.println("Malloc failed!");
  }

  http.end();
  return "";
}
