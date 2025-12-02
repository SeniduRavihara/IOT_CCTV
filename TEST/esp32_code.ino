#include <WiFi.h>
#include <WebServer.h>

// ==========================================
// 🔧 CONFIGURATION
// ==========================================
const char* ssid = "HUAWEI nova 3i";
const char* password = "senidu1234";
const int ledPin = 2; // Built-in LED usually on GPIO 2

// ==========================================
// 🌐 GLOBALS
// ==========================================
WebServer server(80);
bool ledState = false;

// ==========================================
// 🛠️ SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // Connect to WiFi
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected.");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  // Define Routes
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/toggle", handleToggle);
  server.onNotFound(handleNotFound);

  // Enable CORS
  // server.enableCORS(true); // REMOVED: We are manually adding headers in addCorsHeaders() to avoid duplicates

  server.begin();
  Serial.println("HTTP server started");
}

// ==========================================
// 🔄 LOOP
// ==========================================
void loop() {
  server.handleClient();
}

// ==========================================
// 📡 HANDLERS
// ==========================================

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleRoot() {
  addCorsHeaders();
  server.send(200, "text/plain", "ESP32 is Online! Use the Dashboard to control me.");
}

void handleStatus() {
  addCorsHeaders();
  
  // Create JSON response manually to avoid external dependencies like ArduinoJSON for this simple test
  String json = "{";
  json += "\"uptime\": " + String(millis() / 1000) + ",";
  json += "\"temperature\": " + String(temperatureRead(), 1) + ","; // Internal ESP32 temp sensor
  json += "\"led\": " + String(ledState ? "true" : "false");
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleToggle() {
  addCorsHeaders();
  
  if (server.hasArg("state")) {
    String state = server.arg("state");
    if (state == "1") {
      ledState = true;
    } else {
      ledState = false;
    }
    digitalWrite(ledPin, ledState ? HIGH : LOW);
    server.send(200, "text/plain", "OK");
  } else {
    // If no arg, just toggle
    ledState = !ledState;
    digitalWrite(ledPin, ledState ? HIGH : LOW);
    server.send(200, "text/plain", "Toggled");
  }
}

void handleNotFound() {
  if (server.method() == HTTP_OPTIONS) {
    addCorsHeaders();
    server.send(204);
  } else {
    addCorsHeaders();
    server.send(404, "text/plain", "Not Found");
  }
}
