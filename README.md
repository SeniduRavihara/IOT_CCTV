# 📘 AI-Powered Unauthorized Person Detection Using ESP32-CAM & Firebase Cloud Functions

> Complete Procedure and Implementation Guide

---

## 📝 1. Introduction

This project uses an **ESP32-CAM** module integrated with **Firebase Cloud Functions** and **AI face recognition** to detect unauthorized persons entering a home.

When the system detects someone not registered as a known individual, it sends an instant email alert to the homeowner with an image of the intruder.

---

## 🎯 2. Objectives

- ✅ Capture images using ESP32-CAM
- ✅ Send images to Firebase backend
- ✅ Run AI-based face recognition
- ✅ Identify registered vs. unregistered persons
- ✅ Send email alerts for unknown individuals
- ✅ Store logs for future review

---

## 🔧 3. Technology Stack

### Hardware

| Component             | Description               |
| --------------------- | ------------------------- |
| **ESP32-CAM**         | AI Thinker module         |
| **FTDI Programmer**   | For uploading code        |
| **PIR Motion Sensor** | Optional motion detection |
| **Power Supply**      | 5V regulated              |

### Software & Tools

- 🔥 **Firebase Cloud Functions**
- 📦 **Firebase Storage**
- 🗄️ **Firebase Firestore**
- 🤖 **Node.js or Python AI model**
- 📧 **Nodemailer** (for sending emails)
- 💻 **Arduino IDE**

---

## ⚙️ 4. System Architecture Overview

```
ESP32-CAM → Firebase Cloud Function → AI Face Detection →
Known Person? → YES → No Alert
Known Person? → NO → Send Email + Save Alert
```

### Steps in architecture:

1. 📸 **ESP32-CAM** detects motion or periodically captures an image
2. 📤 **ESP32-CAM** sends the image to Firebase Cloud Function using HTTP POST
3. ☁️ **Cloud Function** uploads the image to Firebase Storage
4. 🧠 **AI model** extracts face embeddings
5. 🔍 Face compared with known user embeddings stored in Firestore
6. ⚠️ If no match → send email alert with image
7. 📝 Log the alert in Firestore

---

## 🖼️ 5. Firebase Components Used

### 1. Firebase Cloud Functions

Handles backend logic:

- 📥 Receive image
- 🧠 Process face recognition
- 🔍 Compare with database
- 📧 Send email
- 📝 Log alert

### 2. Firebase Storage

Stores incoming images:

```
/alerts/incoming/<timestamp>.jpg
```

### 3. Firebase Firestore

Stores:

- 👥 Known people embeddings
- 🚨 Alert history

**Example Structure:**

```javascript
known_users/
    user1/ { name: "Father", embedding: [128 values] }

alerts/
    alert1/ { imageUrl: "...", timestamp: "...", status: "unknown" }
```

---

## 📡 6. ESP32-CAM Workflow

### Step 1 — Initialize camera

Configure pins and start camera feed.

### Step 2 — Capture image

Triggered by:

- 🔴 Motion detection, or
- ⏰ Timed interval

### Step 3 — Send image to Cloud Function

Send JPEG bytes via HTTP POST:

```
https://your-cloud-function-url/detectPerson
```

### Step 4 — Wait for response

The Cloud Function returns:

```json
{ "status": "known" }
```

or

```json
{ "status": "unknown" }
```

---

## ☁️ 7. Cloud Function Workflow

### Step 1 — Receive image from ESP32

Image arrives as raw bytes or Base64.

### Step 2 — Save to Firebase Storage

File stored under:

```
alerts/incoming/<timestamp>.jpg
```

### Step 3 — Extract face embeddings

Use AI model (Node.js or Python):

1. 📷 Load face detector
2. ✂️ Crop face
3. 🔢 Convert face into numerical vector (embedding)

**Example:** 128-dim vector:

```
[0.123, -0.221, 0.554, ...]
```

### Step 4 — Compare embedding with known persons

Calculate distance:

```
distance = L2(embedding_new, embedding_stored)
```

> If `distance < threshold` → same person.

### Step 5 — Decision

| Result         | Action                |
| -------------- | --------------------- |
| ✅ **Known**   | Do nothing            |
| ⚠️ **Unknown** | Send email + save log |

---

## 📧 8. Email Notification System

Cloud Function uses **Nodemailer** or another SMTP provider.

### Email includes:

- 📌 **Subject:** Unauthorized Person Detected
- 📄 **Body:** Time + description
- 🖼️ **Attachment:** Captured image

---

## 📁 9. Firestore Logging Structure

```javascript
alerts/
   alertId/
      status: "unknown"
      time: "2025-11-30 10:41"
      imageURL: "..."
```

> Logs help maintain history for the security system.

---

## 💻 10. High-Level Cloud Function Pseudocode

```javascript
exports.detectPerson = async (req, res) => {
  const imageBuffer = req.rawBody;

  const imageUrl = await uploadToStorage(imageBuffer);
  const embedding = await generateFaceEmbedding(imageBuffer);

  const knownUsers = await loadKnownEmbeddings();
  const matched = compareEmbeddings(embedding, knownUsers);

  if (!matched) {
    await sendEmailAlert(imageUrl);
    await saveAlertToFirestore(imageUrl);
    return res.json({ status: "unknown" });
  }

  return res.json({ status: "known" });
};
```

---

## 🧪 11. Optional Features

- 🔹 **Telegram notifications**
- 🔹 **Live view from ESP32**
- 🔹 **Add SD card storage**
- 🔹 **Home-owner web/mobile dashboard**

---

## 📝 12. Conclusion

This project combines:

- 🌐 **IoT** (ESP32-CAM)
- ☁️ **Cloud** (Firebase)
- 🤖 **AI** (Face Recognition)

to build a scalable and smart home security system that:

- ✅ Identifies visitors
- ⚠️ Detects unregistered persons
- 📧 Sends instant alerts

**It is powerful, low-cost, and fully customizable.**

---

<div align="center">

**Made with ❤️ for Smart Home Security**

</div>
