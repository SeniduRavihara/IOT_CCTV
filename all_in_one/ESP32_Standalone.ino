#include "esp_camera.h"
#include <WiFi.h>
#include "FS.h"
#include "SD_MMC.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Select Camera Model
#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// ==========================================
// 1. CONFIGURATION
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Email Settings (Requires ESP-Mail-Client Library)
// #include <ESP_Mail_Client.h> 
// Un-comment the include above and install the library to use email.

// ==========================================
// 2. GLOBAL VARIABLES
// ==========================================
void startCameraServer();

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Disable brownout detector
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  // --- Camera Config ---
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
  
  // Init with high specs to pre-allocate larger buffers
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Camera Init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  // Drop down frame size for higher initial frame rate & Face Recog
  sensor_t * s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_QVGA); // QVGA is required for Face Recognition

  // --- SD Card Init ---
  Serial.println("Mounting SD Card...");
  if(!SD_MMC.begin()){
    Serial.println("SD Card Mount Failed");
  } else {
    uint8_t cardType = SD_MMC.cardType();
    if(cardType == CARD_NONE){
      Serial.println("No SD Card attached");
    } else {
      Serial.println("SD Card Mounted Successfully");
      // Create a folder for logs if it doesn't exist
      FS &fs = SD_MMC;
      if(!fs.exists("/intruders")){
        fs.mkdir("/intruders");
      }
    }
  }

  // --- WiFi Init ---
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");

  // --- Start Web Server ---
  startCameraServer();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
}

void loop() {
  // The Web Server handles everything in the background.
  // You can add periodic checks here (e.g. check battery, check sensors).
  delay(10000);
}

// Helper to save image to SD Card (Call this from web_server.cpp)
void saveToSD(uint8_t * buf, size_t len) {
  if(!SD_MMC.cardType() == CARD_NONE) return;
  
  String path = "/intruders/capture_" + String(millis()) + ".jpg";
  Serial.printf("Saving picture: %s\n", path.c_str());

  FS &fs = SD_MMC;
  File file = fs.open(path.c_str(), FILE_WRITE);
  if(!file){
    Serial.println("Failed to open file in writing mode");
  } else {
    file.write(buf, len);
    Serial.printf("Saved: %s, Size: %u\n", path.c_str(), len);
  }
  file.close();
}
