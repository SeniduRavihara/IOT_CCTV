# 📸 ESP32-CAM Standalone Security System (All-in-One)

## 🤖 Project Overview
This project transforms an **ESP32-CAM** module into a completely standalone security camera with **On-Board Face Recognition**. Unlike the main project (which relies on a Python backend), this version runs all logic—video streaming, face detection, recognition, and storage—directly on the ESP32 chip.

**Primary Function:** Monitors a video feed, detects faces, recognizes registered users, and logs images of "Unknown" intruders to an SD card.

---

## ✨ Key Features
1.  **On-Board AI:** Uses the `esp-face` library (MTMN for detection, MobileFaceNet for recognition) running on the ESP32's CPU.
2.  **Standalone Operation:** No external server, PC, or WiFi connection to a backend required for core functionality.
3.  **Intruder Logging:** Automatically saves snapshots of **Unknown** faces to the MicroSD card in the `/intruders` folder.
4.  **Web Dashboard:** Hosts a local web server for:
    *   Live MJPEG Video Stream.
    *   Face Enrollment (Registration).
    *   Camera Settings (Resolution, Contrast, etc.).
5.  **Smart Storage:** Only saves images when an intruder is detected (with a 2-second cooldown to prevent duplicate spam).

---

## 📂 File Structure & Code Explanation
*(For AI Context: This project is a modified version of the Espressif CameraWebServer example)*

*   **`ESP32_Standalone.ino`**: The entry point.
    *   Initializes the Camera (OV2640).
    *   Initializes the SD Card (SD_MMC).
    *   Connects to WiFi.
    *   Starts the HTTP Server.
    *   Contains the `saveToSD(uint8_t * buf, size_t len)` helper function.
*   **`app_httpd.cpp`**: The core logic.
    *   Handles HTTP requests (`/stream`, `/capture`, `/control`).
    *   **Crucial Modification:** Inside `stream_handler`, logic was added to check if `face_id == -1` (Unknown). If true, it calls `saveToSD` to write the current frame buffer to the SD card.
    *   Manages the Face Recognition pipeline (`run_face_recognition`).
*   **`camera_pins.h`**: Pin definitions for the AI Thinker ESP32-CAM board.
*   **`camera_index.h`**: Gzipped HTML/JS for the web interface.

---

## 🛠️ Hardware Requirements
*   **ESP32-CAM Module** (AI Thinker Model recommended).
*   **FTDI Programmer** (USB-to-TTL) for flashing code.
*   **MicroSD Card** (Formatted as FAT32, max 32GB recommended).
*   5V Power Supply (The USB port on a PC might not provide enough current; external 5V 2A is better for stability).

---

## 🚀 Setup & Installation Guide

### 1. Software Prerequisites
*   **Arduino IDE** installed.
*   **ESP32 Board Manager** installed (version `1.0.6` is often most stable for Face Recognition, but `2.x` works too).

### 2. Configuration
1.  Open `ESP32_Standalone.ino`.
2.  Update the WiFi credentials:
    ```cpp
    const char* ssid = "YOUR_WIFI_SSID";
    const char* password = "YOUR_WIFI_PASSWORD";
    ```
3.  Ensure `#define CAMERA_MODEL_AI_THINKER` is uncommented.

### 3. Flashing
1.  Connect GPIO 0 to GND (to enter Flash Mode).
2.  Select Board: **AI Thinker ESP32-CAM**.
3.  Select Partition Scheme: **Huge APP (3MB No OTA/1MB SPIFFS)**. *Critical: Standard partition is too small for Face Recognition.*
4.  Click **Upload**.
5.  Disconnect GPIO 0 from GND and press the Reset button.

---

## 📖 Usage Instructions

### Accessing the Dashboard
1.  Open the Serial Monitor (Baud 115200) to see the IP address (e.g., `http://192.168.1.15`).
2.  Open that URL in a web browser.

### Enrolling a Face (Registration)
1.  Scroll down to the bottom of the menu.
2.  Toggle **"Face Recognition"** to ON.
3.  Type a name (or use the ID number).
4.  Click **"Enroll Face"**.
5.  Look at the camera and move your head slightly until 5 samples are captured.
6.  You are now registered! The box around your face will turn Green.

### Intruder Detection
1.  If a person walks by who is **NOT** enrolled:
    *   The box around their face will be **Red**.
    *   The system will detect `face_id = -1`.
    *   It will automatically save a snapshot to the SD card: `/intruders/capture_123456.jpg`.

---

## ⚠️ Technical Limitations (For AI Analysis)
*   **Resolution:** Face recognition requires `QVGA` (320x240) resolution. Higher resolutions (SVGA/UXGA) are used for streaming/capture but cannot run the AI model due to RAM constraints.
*   **Memory:** The ESP32 has limited PSRAM (4MB). The code is optimized to balance buffer allocation between the camera, the HTTP stream, and the Tensor arena for the AI model.
*   **Performance:** Frame rate drops significantly when Face Recognition is active (approx 2-5 FPS).
*   **Persistence:** Enrolled faces are stored in the ESP32's flash memory, but the storage space is limited (typically max 5-7 faces).

---

## 📧 Email Alerts (Optional)
The code contains placeholders for **ESP-Mail-Client**.
*   To enable: Uncomment the library include and configuration in `ESP32_Standalone.ino`.
*   **Note:** Sending emails blocks the main loop for several seconds, causing the video stream to freeze. SD Card logging is recommended for smoother performance.
