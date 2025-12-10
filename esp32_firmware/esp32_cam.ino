#include "esp_camera.h"
#include <WiFi.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h" // Disable brownout problems
#include "soc/rtc_cntl_reg.h"  // Disable brownout problems
#include "esp_http_server.h"
#include "HTTPClient.h"

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

httpd_handle_t camera_httpd = NULL;
bool is_streaming = false;
volatile bool control_active = false;  // Pause streaming during servo control
volatile bool stream_enabled = true;   // Master switch for streaming

void setServoAngle(int pin, int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  int duty = map(angle, 0, 180, SERVO_MIN_DUTY, SERVO_MAX_DUTY);
  ledcWrite(pin, duty);
}

// ==========================================
// 4. WEB SERVER HANDLERS
// ==========================================

static esp_err_t index_handler(httpd_req_t *req){
    httpd_resp_set_type(req, "text/plain");
    return httpd_resp_send(req, "ESP32-CAM Robot Online (Motion Detection Active)", 46);
}

static esp_err_t stream_handler(httpd_req_t *req){
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t * _jpg_buf = NULL;
    char part_buf[128];

    // Check if streaming is enabled
    if(!stream_enabled){
        httpd_resp_set_status(req, "503 Service Unavailable");
        httpd_resp_set_type(req, "text/plain");
        return httpd_resp_send(req, "Stream is paused. Use /stream_control?enable=1 to resume.", 60);
    }

    res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=123456789000000000000987654321");
    if(res != ESP_OK) return res;

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "X-Framerate", "60");  // Tell browser to expect high FPS
    is_streaming = true;

    while(stream_enabled){  // Exit loop if streaming disabled
        // Pause streaming if servo control is active
        if(control_active){
            delay(10);  // Wait for control to finish
            continue;
        }
        
        fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed");
            res = ESP_FAIL;
            break;
        }
        
        _jpg_buf_len = fb->len;
        _jpg_buf = fb->buf;
        
        if(res == ESP_OK){
            res = httpd_resp_send_chunk(req, "--123456789000000000000987654321\r\n", 37);
        }
        if(res == ESP_OK){
            size_t hlen = snprintf(part_buf, 128, "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", _jpg_buf_len);
            res = httpd_resp_send_chunk(req, part_buf, hlen);
        }
        if(res == ESP_OK){
            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        if(res == ESP_OK){
            res = httpd_resp_send_chunk(req, "\r\n", 2);
        }
        
        esp_camera_fb_return(fb);
        
        if(res != ESP_OK){
            break;
        }
        
        // Small delay to prevent camera lock and allow other requests
        delay(10);  // Minimal delay, high FPS
    }
    is_streaming = false;
    return res;
}

static esp_err_t stream_control_handler(httpd_req_t *req){
    char param[32] = {0,};
    
    if(httpd_req_get_url_query_str(req, param, sizeof(param)) == ESP_OK) {
        char value[8];
        if(httpd_query_key_value(param, "enable", value, sizeof(value)) == ESP_OK) {
            int enable = atoi(value);
            stream_enabled = (enable == 1);
            Serial.printf("📹 Stream %s\n", stream_enabled ? "ENABLED" : "DISABLED");
        }
    }
    
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, stream_enabled ? "Stream enabled" : "Stream disabled", 
                          stream_enabled ? 14 : 15);
}

static esp_err_t control_handler(httpd_req_t *req){
    char*  buf;
    size_t buf_len;
    char param[32] = {0,};
    char value[32] = {0,};

    // Signal streaming to pause (non-blocking)
    control_active = true;
    
    buf_len = httpd_req_get_url_query_len(req) + 1;
    if (buf_len > 1) {
        buf = (char*)malloc(buf_len);
        if(!buf){
            control_active = false;
            httpd_resp_send_500(req);
            return ESP_FAIL;
        }
        if (httpd_req_get_url_query_str(req, buf, buf_len) == ESP_OK) {
            if (httpd_query_key_value(buf, "pan", value, sizeof(value)) == ESP_OK) {
                int val = atoi(value);
                setServoAngle(SERVO_PAN_PIN, val);
                Serial.printf("✓ Pan: %d\n", val);
            }
            if (httpd_query_key_value(buf, "tilt", value, sizeof(value)) == ESP_OK) {
                int val = atoi(value);
                setServoAngle(SERVO_TILT_PIN, val);
                Serial.printf("✓ Tilt: %d\n", val);
            }
            if (httpd_query_key_value(buf, "led", value, sizeof(value)) == ESP_OK) {
                int val = atoi(value);
                digitalWrite(FLASH_GPIO_NUM, val > 0 ? HIGH : LOW);
                Serial.printf("✓ LED: %d\n", val);
            }
        }
        free(buf);
    }
    
    // Resume streaming immediately
    control_active = false;
    
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, "OK", 2);
}

void startCameraServer(){
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.ctrl_port = 32768;
    config.max_open_sockets = 7;
    config.max_uri_handlers = 8;
    config.max_resp_headers = 8;
    config.backlog_conn = 5;
    config.lru_purge_enable = true;
    config.recv_wait_timeout = 5;
    config.send_wait_timeout = 5;
    config.stack_size = 8192;  // Increased stack size for better streaming

    httpd_uri_t index_uri = {
        .uri       = "/",
        .method    = HTTP_GET,
        .handler   = index_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t stream_uri = {
        .uri       = "/stream",
        .method    = HTTP_GET,
        .handler   = stream_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t control_uri = {
        .uri       = "/control",
        .method    = HTTP_GET,
        .handler   = control_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t stream_control_uri = {
        .uri       = "/stream_control",
        .method    = HTTP_GET,
        .handler   = stream_control_handler,
        .user_ctx  = NULL
    };

    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &index_uri);
        httpd_register_uri_handler(camera_httpd, &stream_uri);
        httpd_register_uri_handler(camera_httpd, &control_uri);
        httpd_register_uri_handler(camera_httpd, &stream_control_uri);
    }
}

// ==========================================
// 5. MOTION DETECTION LOGIC
// ==========================================
#define MOTION_THRESHOLD 900    // Sensitivity (lower = more sensitive)
#define MOTION_SAMPLE_PIXELS 100  // Number of pixels to check

uint32_t prev_frame_checksum = 0;

bool detectMotion(camera_fb_t * fb) {
    // Simple motion detection: Compare pixel checksums
    // Sample pixels evenly across the frame
    uint32_t current_checksum = 0;
    uint32_t step = fb->len / MOTION_SAMPLE_PIXELS;
    
    for (int i = 0; i < MOTION_SAMPLE_PIXELS; i++) {
        current_checksum += fb->buf[i * step];
    }
    
    // First frame - no motion detection possible
    if (prev_frame_checksum == 0) {
        prev_frame_checksum = current_checksum;
        Serial.println("First frame - initializing motion detection");
        return true;  // Send first frame
    }
    
    // Calculate difference
    uint32_t diff = abs((int32_t)(current_checksum - prev_frame_checksum));
    prev_frame_checksum = current_checksum;
    
    // DEBUG: Print diff value to tune threshold
    Serial.printf("Motion check - Diff: %u (Threshold: %d)\n", diff, MOTION_THRESHOLD);
    
    if (diff > MOTION_THRESHOLD) {
        Serial.printf("✓ Motion detected! Diff: %u\n", diff);
        return true;
    }
    
    return false;
}

void sendImageToBackend(camera_fb_t * fb) {
    HTTPClient http;
    http.begin(server_url);
    http.addHeader("Content-Type", "image/jpeg"); // Actually multipart is better but raw bytes work for some
    
    // We need to send as multipart/form-data for the Flask backend to see it as 'image' file
    String boundary = "------------------------7d87f1e6b3b8b42f";
    String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--" + boundary + "--\r\n";

    uint32_t imageLen = fb->len;
    uint32_t extraLen = head.length() + tail.length();
    uint32_t totalLen = imageLen + extraLen;

    http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
    
    // This is tricky with HTTPClient to send chunks. 
    // Let's try a simpler approach: Post raw bytes and update backend? 
    // No, backend expects 'image' file.
    
    // Construct full buffer? (Might run out of RAM)
    // Better: Use start/end logic if supported, or just send raw if backend supports it.
    // Let's stick to the standard multipart construction.
    
    uint8_t * buffer = (uint8_t *)malloc(totalLen);
    if(buffer){
        memcpy(buffer, head.c_str(), head.length());
        memcpy(buffer + head.length(), fb->buf, imageLen);
        memcpy(buffer + head.length() + imageLen, tail.c_str(), tail.length());
        
        int httpResponseCode = http.POST(buffer, totalLen);
        if (httpResponseCode > 0) {
            Serial.printf("Backend Response: %d\n", httpResponseCode);
        } else {
            Serial.printf("Backend Error: %s\n", http.errorToString(httpResponseCode).c_str());
        }
        free(buffer);
    }
    http.end();
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  Serial.setDebugOutput(true);

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
  
  // OPTIMIZED FOR SMOOTH STREAMING (not quality)
  config.frame_size = FRAMESIZE_SVGA;  // 800x600 - good balance
  config.jpeg_quality = 12;  // Lower quality = smaller files = faster streaming
  config.fb_count = 2;  // Double buffer for smooth streaming
  config.grab_mode = CAMERA_GRAB_LATEST;  // Always grab latest frame (skip old frames)

  esp_camera_init(&config);

  ledcAttach(SERVO_PAN_PIN, PWM_FREQ, PWM_RES);
  ledcAttach(SERVO_TILT_PIN, PWM_FREQ, PWM_RES);
  setServoAngle(SERVO_PAN_PIN, 90);
  setServoAngle(SERVO_TILT_PIN, 90);

  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // WiFi Configuration for maximum performance
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);  // Disable WiFi sleep for better streaming performance
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
  Serial.print("Stream URL: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/stream");
  
  // Set WiFi to maximum transmit power
  WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Maximum WiFi power
  
  startCameraServer();
}

long last_motion_check = 0;
long last_frame_sent = 0;
long last_stream_warning = 0;
#define CHECK_INTERVAL 2000  // Check for motion every 2 seconds when streaming
#define CHECK_INTERVAL_NORMAL 500  // Check every 500ms when not streaming

void loop() {
  // Adjust motion detection based on streaming state
  int check_interval = is_streaming ? CHECK_INTERVAL : CHECK_INTERVAL_NORMAL;
  
  // Check for motion periodically
  if (millis() - last_motion_check > check_interval) {
      camera_fb_t * fb = esp_camera_fb_get();
      if (fb) {
          // Only send frame if motion detected
          if (detectMotion(fb)) {
              // Limit frame rate to avoid spamming backend
              if (millis() - last_frame_sent > 3000) {  // Max 1 frame per 3 seconds
                  sendImageToBackend(fb);
                  last_frame_sent = millis();
                  Serial.println("📸 Frame sent to backend for AI detection");
              } else {
                  Serial.println("Motion detected but rate limited");
              }
          }
          esp_camera_fb_return(fb);
      }
      last_motion_check = millis();
      
      // Show streaming status
      if (is_streaming && (millis() - last_stream_warning > 10000)) {
          Serial.println("ℹ️ Live stream active - motion detection running slower");
          last_stream_warning = millis();
      }
  }
  
  delay(10);  // Small delay to prevent watchdog issues
}
