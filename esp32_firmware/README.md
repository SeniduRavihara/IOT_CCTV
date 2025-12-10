# ESP32-CAM Firmware - Smart Security Camera

## 🎯 Overview

Arduino firmware for ESP32-CAM module with intelligent motion detection, live MJPEG streaming, servo control (pan/tilt), and flashlight. Connects to backend for AI-powered face recognition.

---

## ⚡ Quick Setup

```cpp
// 1. Update WiFi credentials (lines 14-15)
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// 2. Update backend URL (line 16)
const char* server_url = "http://YOUR_BACKEND_IP:5001/detect";

// 3. Upload to ESP32-CAM using Arduino IDE
// 4. Open Serial Monitor (115200 baud) to see IP address
// 5. Access stream at http://ESP32_IP/stream
```

---

## 📦 Hardware Requirements

### ESP32-CAM Module

- **Model:** AI-Thinker ESP32-CAM
- **Camera:** OV2640 (2MP)
- **Memory:** 4MB Flash
- **WiFi:** 2.4GHz (5GHz not supported)

### Additional Components

- USB to Serial programmer (FTDI, CP2102, or CH340)
- 2x Servo motors (SG90 or similar) - Optional for pan/tilt
- 5V power supply (2A minimum recommended)
- Jumper wires
- Breadboard (for prototyping)

### Pin Connections

#### Camera (Built-in - Do not modify)

| ESP32 Pin | Function |
| --------- | -------- |
| GPIO 0    | XCLK     |
| GPIO 5    | D2       |
| GPIO 18   | D3       |
| GPIO 19   | D4       |
| GPIO 21   | D5       |
| GPIO 36   | D6       |
| GPIO 39   | D7       |
| GPIO 34   | D8       |
| GPIO 35   | D9       |
| GPIO 25   | VSYNC    |
| GPIO 23   | HREF     |
| GPIO 22   | PCLK     |
| GPIO 26   | SIOD     |
| GPIO 27   | SIOC     |
| GPIO 32   | PWDN     |

#### Servos (Optional)

| ESP32 Pin | Component         | Color  |
| --------- | ----------------- | ------ |
| GPIO 12   | Pan Servo Signal  | Orange |
| GPIO 13   | Tilt Servo Signal | Orange |
| 5V Ext    | Servo Power       | Red    |
| GND       | Servo Ground      | Brown  |

**⚠️ Important:** Use external 5V power for servos. ESP32's 5V pin cannot supply enough current.

#### Flashlight (Built-in)

| ESP32 Pin | Function                |
| --------- | ----------------------- |
| GPIO 4    | Flash LED (Active HIGH) |

---

## 🔧 Software Requirements

### Arduino IDE

1. Download from [arduino.cc](https://www.arduino.cc/en/software)
2. Install version 2.0 or higher

### ESP32 Board Support

1. Open Arduino IDE
2. File → Preferences
3. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Tools → Board → Boards Manager
5. Search "ESP32" → Install "esp32 by Espressif Systems"

### Required Libraries

All libraries are included with ESP32 board package:

- `esp_camera.h` - Camera driver
- `WiFi.h` - WiFi connectivity
- `esp_http_server.h` - HTTP server
- `HTTPClient.h` - HTTP client (for backend communication)

---

## 📝 Configuration

### 1. WiFi Settings

```cpp
// Lines 14-16 in esp32_cam.ino
const char* ssid = "YOUR_WIFI_SSID";          // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";   // Your WiFi password
const char* server_url = "http://192.168.1.100:5001/detect";  // Backend IP
```

**Finding Backend IP:**

- Backend machine: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Look for IPv4 address (e.g., 192.168.1.100)
- Must be on same network as ESP32

### 2. Motion Detection Settings

```cpp
// Lines 217-218
#define MOTION_THRESHOLD 1200        // Sensitivity (lower = more sensitive)
#define MOTION_SAMPLE_PIXELS 100     // Pixels to check (higher = more accurate)
```

**Tuning Tips:**

- **Too many false alarms:** Increase `MOTION_THRESHOLD` (e.g., 1500-2000)
- **Missing motion:** Decrease `MOTION_THRESHOLD` (e.g., 800-1000)
- Monitor Serial output for "Motion check - Diff: XXX" to tune

### 3. Camera Settings

```cpp
// Lines 321-324
config.frame_size = FRAMESIZE_SVGA;  // 800x600
config.jpeg_quality = 12;            // 10-63 (lower = better quality, larger file)
config.fb_count = 2;                 // Frame buffers (2 = double buffering)
```

**Resolution Options:**

- `FRAMESIZE_QVGA` - 320x240 (fastest, lowest quality)
- `FRAMESIZE_VGA` - 640x480 (good balance)
- `FRAMESIZE_SVGA` - 800x600 (current - recommended)
- `FRAMESIZE_XGA` - 1024x768 (high quality, slower)
- `FRAMESIZE_UXGA` - 1600x1200 (highest, may be unstable)

### 4. Servo Settings (Optional)

```cpp
// Lines 36-42
#define SERVO_PAN_PIN 12     // Pan servo GPIO
#define SERVO_TILT_PIN 13    // Tilt servo GPIO
#define PWM_FREQ 50          // Standard servo frequency
#define SERVO_MIN_US 500     // Min pulse width
#define SERVO_MAX_US 2400    // Max pulse width
```

**Calibration:**

- Adjust `SERVO_MIN_US` and `SERVO_MAX_US` if servo doesn't reach full range
- Test with: `http://ESP32_IP/control?pan=0` (min) and `pan=180` (max)

---

## 🚀 Upload Firmware

### Step 1: Connect ESP32-CAM

**Wiring for Programming:**

```
FTDI/USB Programmer → ESP32-CAM
---------------------------------
5V    → 5V
GND   → GND
TX    → U0R (Receive)
RX    → U0T (Transmit)
GND   → IO0 (for flash mode)
```

**⚠️ Important:**

- Connect IO0 to GND before powering on (puts ESP32 in flash mode)
- Some programmers provide 3.3V - use external 5V supply if camera fails to initialize

### Step 2: Arduino IDE Settings

1. **Select Board:**

   - Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**

2. **Configure Options:**

   - Port: Select your programmer's COM port
   - CPU Frequency: **240MHz** (max performance)
   - Flash Frequency: **80MHz**
   - Flash Mode: **QIO**
   - Flash Size: **4MB**
   - Partition Scheme: **Huge APP (3MB No OTA/1MB SPIFFS)**
   - Upload Speed: **115200** (slower = more stable)
   - Core Debug Level: **None** (or "Info" for debugging)

3. **Upload:**
   - Click Upload button (→)
   - Wait for "Connecting..." message
   - If stuck, press RESET button on ESP32 during "Connecting..."

### Step 3: Verify Upload

1. **Disconnect IO0 from GND**
2. **Press RESET button** on ESP32-CAM
3. **Open Serial Monitor** (115200 baud)
4. You should see:
   ```
   WiFi connected
   Camera Ready! Use 'http://192.168.x.x' to connect
   Stream URL: http://192.168.x.x/stream
   Motion check - Diff: 123 (Threshold: 1200)
   ```

---

## 📡 API Endpoints

### 1. Root Endpoint

**GET** `http://ESP32_IP/`

Returns status message:

```
ESP32-CAM Robot Online (Motion Detection Active)
```

### 2. Live Stream

**GET** `http://ESP32_IP/stream`

- **Format:** MJPEG (multipart/x-mixed-replace)
- **Resolution:** 800x600 (SVGA)
- **Frame Rate:** 25-30 FPS
- **Usage:** Open in browser or use in HTML:
  ```html
  <img src="http://192.168.1.100/stream" />
  ```

### 3. Camera Control

**GET** `http://ESP32_IP/control?[parameters]`

**Parameters:**

- `pan=0-180` - Pan servo angle
- `tilt=0-180` - Tilt servo angle
- `led=0/1` - Flashlight off/on

**Examples:**

```bash
# Pan to center, tilt to center
curl "http://192.168.1.100/control?pan=90&tilt=90"

# Turn on flashlight
curl "http://192.168.1.100/control?led=1"

# Combined control
curl "http://192.168.1.100/control?pan=45&tilt=60&led=1"
```

---

## 🎛️ Features

### Motion Detection

- **Algorithm:** Pixel checksum comparison
- **Sampling:** 100 evenly distributed pixels
- **Adaptive Mode:**
  - 500ms interval when idle
  - 2000ms interval when streaming (reduces conflicts)
- **Rate Limiting:** Max 1 frame sent per 3 seconds

### Live Streaming

- **Protocol:** MJPEG over HTTP
- **Optimization:**
  - Double buffering (2 frame buffers)
  - GRAB_LATEST mode (always fresh frames)
  - WiFi sleep disabled
  - Max transmit power (19.5dBm)
- **CORS:** Enabled for cross-origin access

### Servo Control

- **Pan Range:** 0-180° (GPIO 12)
- **Tilt Range:** 0-180° (GPIO 13)
- **PWM Frequency:** 50Hz (standard servo)
- **Default Position:** 90° (center)

### Flashlight

- **GPIO:** 4 (built-in LED)
- **Control:** ON (HIGH) / OFF (LOW)
- **Brightness:** Fixed (hardware limitation)

---

## 🐛 Troubleshooting

### Upload Issues

**Problem: "Failed to connect"**

- **Solution:**
  - Ensure IO0 connected to GND during upload
  - Press RESET button when "Connecting..." appears
  - Try lower upload speed (57600)
  - Check USB cable and connections

**Problem: "A fatal error occurred: MD5 of file does not match"**

- **Solution:**
  - Reduce upload speed to 115200
  - Use shorter/better USB cable
  - Try different USB port

**Problem: "Brownout detector was triggered"**

- **Solution:**
  - Use external 5V power supply (2A)
  - Don't power ESP32 from USB programmer
  - Code already disables brownout detector

### Runtime Issues

**Problem: "WiFi connection failed"**

- **Solution:**
  - Check SSID and password (case-sensitive)
  - Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
  - Move closer to router
  - Check router settings (some block new devices)

**Problem: "Camera init failed"**

- **Solution:**
  - Check all camera pins are connected (built-in)
  - Try lowering `xclk_freq_hz` to 10000000 (line 316)
  - Verify ESP32-CAM board quality (common with cheap clones)
  - Reset ESP32 and try again

**Problem: "Stream is choppy/laggy"**

- **Solution:**
  - Reduce resolution to VGA: `config.frame_size = FRAMESIZE_VGA`
  - Increase quality value: `config.jpeg_quality = 15`
  - Ensure strong WiFi signal
  - Close other applications using network

**Problem: "Motion detection not working"**

- **Solution:**
  - Check Serial Monitor for "Motion check - Diff: XXX"
  - Adjust `MOTION_THRESHOLD` based on diff values
  - Ensure good lighting
  - Verify backend URL is correct

**Problem: "Backend not receiving images"**

- **Solution:**
  - Ping backend IP from another device: `ping 192.168.1.100`
  - Check backend is running: `curl http://192.168.1.100:5001/stats`
  - Verify firewall not blocking port 5001
  - Check Serial Monitor for HTTP response codes

**Problem: "Servo not moving"**

- **Solution:**
  - Use external 5V power for servos (not ESP32 5V pin)
  - Check servo signal wires on GPIO 12/13
  - Test manually: `http://ESP32_IP/control?pan=0` then `pan=180`
  - Verify servo is working (test with Arduino)

**Problem: "Flashlight not working"**

- **Solution:**
  - GPIO 4 is correct for AI-Thinker ESP32-CAM
  - Test: `http://ESP32_IP/control?led=1`
  - Some boards have weak flash LED (normal)

---

## 🔧 Advanced Configuration

### Increase Frame Rate

```cpp
// Reduce resolution for speed
config.frame_size = FRAMESIZE_VGA;  // 640x480

// Lower quality for smaller files
config.jpeg_quality = 15;

// Increase XCLK frequency (may be unstable)
config.xclk_freq_hz = 25000000;
```

### Reduce Motion Detection Sensitivity

```cpp
// For outdoor/windy environments
#define MOTION_THRESHOLD 2000      // Higher = less sensitive
#define MOTION_SAMPLE_PIXELS 150   // More samples = more accurate
```

### Disable Motion Detection (Stream Only)

```cpp
void loop() {
  delay(100);  // Just idle, streaming will work
  // Comment out all motion detection code
}
```

### Change Servo Pins

```cpp
// If GPIO 12/13 conflict with other components
#define SERVO_PAN_PIN 14   // Change to available GPIO
#define SERVO_TILT_PIN 15
```

---

## 📊 Performance Metrics

### Network Usage

- **Stream:** ~2-3 Mbps (800x600 @ 25 FPS, quality 12)
- **Motion Frames:** ~50KB per image
- **Frequency:** Max 1 frame per 3 seconds

### Memory Usage

- **PSRAM:** ~200KB for frame buffers
- **Heap:** ~100KB for HTTP server
- **Total:** ~300KB / 520KB (58%)

### Power Consumption

- **Idle:** ~160mA @ 5V = 0.8W
- **Streaming:** ~300mA @ 5V = 1.5W
- **With Servos:** +200mA per servo

---

## 🔐 Security Notes

1. **No authentication** on HTTP endpoints - suitable for local network only
2. **Don't expose** ESP32 IP to internet without VPN/authentication
3. **Change WiFi password** regularly
4. **Use strong WiFi encryption** (WPA2 or WPA3)
5. **Monitor network** for unauthorized access

---

## 📈 Monitoring

### Serial Monitor Messages

```
✓ Motion detected! Diff: 1523       // Motion triggered
📸 Frame sent to backend            // Image uploaded
Backend Response: 200               // Backend received successfully
Motion check - Diff: 82             // No motion (below threshold)
ℹ️ Live stream active              // Someone viewing stream
```

### Debug Commands

```cpp
// Add to loop() for debugging
Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
Serial.printf("WiFi RSSI: %d dBm\n", WiFi.RSSI());
Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
```

---

## 🔄 Updates

To update firmware:

1. Edit `esp32_cam.ino`
2. Save changes
3. Upload to ESP32 (repeat upload process)
4. Press RESET button

**No need to disconnect servos** during upload.

---

## 📞 Support

**Quick Checks:**

1. Serial Monitor for error messages
2. WiFi signal strength (move closer to router)
3. Backend connectivity (ping test)
4. Power supply (use 2A for stable operation)
5. USB cable quality (data cables, not charge-only)

**Common Serial Errors:**

- `Camera init failed` → Hardware issue or bad board
- `WiFi connection failed` → Wrong credentials or 5GHz network
- `Backend Error: -1` → Backend offline or wrong IP
- `Failed to connect to camera` → Camera busy (wait and retry)

---

**Version:** 1.0  
**Hardware:** AI-Thinker ESP32-CAM  
**License:** Private - For Client Use Only  
**Last Updated:** December 2025
