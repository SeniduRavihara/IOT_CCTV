#include <WiFi.h>
#include <WebServer.h>

// ==========================================
// 1. NETWORK CONFIGURATION
// ==========================================
const char* ssid = "HUAWEI nova 3i";
const char* password = "senidu1234";

WebServer server(80);

// ==========================================
// 2. SERVO CONFIGURATION
// ==========================================
#define SERVO_PAN_PIN 12
#define SERVO_TILT_PIN 13

// PWM Properties
#define PWM_FREQ 50
#define PWM_RES 16
#define SERVO_MIN_US 500
#define SERVO_MAX_US 2400
#define SERVO_MIN_DUTY (int)((SERVO_MIN_US * 65536.0) / 20000.0)
#define SERVO_MAX_DUTY (int)((SERVO_MAX_US * 65536.0) / 20000.0)

#define SERVO_MAX_DUTY (int)((SERVO_MAX_US * 65536.0) / 20000.0)

// Channels (Not needed for v3)
// #define SERVO_PAN_CH 2
// #define SERVO_TILT_CH 3

void setServoAngle(int pin, int angle) {
  if (angle < 0) angle = 0;
  if (angle > 180) angle = 180;
  int duty = map(angle, 0, 180, SERVO_MIN_DUTY, SERVO_MAX_DUTY);
  ledcWrite(pin, duty);
}

void handleRoot() {
  server.send(200, "text/plain", "Servo Controller Online");
}

void handleControl() {
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  if (server.hasArg("pan")) {
    int val = server.arg("pan").toInt();
    setServoAngle(SERVO_PAN_PIN, val);
    Serial.printf("Pan: %d\n", val);
  }
  
  if (server.hasArg("tilt")) {
    int val = server.arg("tilt").toInt();
    setServoAngle(SERVO_TILT_PIN, val);
    Serial.printf("Tilt: %d\n", val);
  }

  server.send(200, "text/plain", "OK");
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200);
}

void setup() {
  Serial.begin(115200);
  delay(1000); // Give serial monitor time to open
  Serial.println("\n\n--- ESP32 SERVO TEST STARTING ---");

  pinMode(2, OUTPUT); // Built-in LED (usually GPIO 2 on standard ESP32)
  
  // Servo Init (v3 API)
  ledcAttach(SERVO_PAN_PIN, PWM_FREQ, PWM_RES);
  ledcAttach(SERVO_TILT_PIN, PWM_FREQ, PWM_RES);

  setServoAngle(SERVO_PAN_PIN, 90);
  setServoAngle(SERVO_TILT_PIN, 90);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(2, !digitalRead(2)); // Blink LED
    delay(500);
    Serial.print(".");
  }
  digitalWrite(2, HIGH); // LED ON when connected
  Serial.println("\nWiFi connected");
  Serial.println("------------------------------------------------");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("------------------------------------------------");

  // Server
  server.on("/", handleRoot);
  server.on("/control", handleControl);
  server.onNotFound(handleOptions); // Handle OPTIONS for CORS
  server.begin();
}

void loop() {
  server.handleClient();
}
