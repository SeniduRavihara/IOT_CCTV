# 📱 Advanced Face Recognition System

A modern face recognition web app with multi-angle enrollment and real-time detection.

## ✨ Features

- **Multi-angle enrollment**: Capture up to 10 angles; embeddings averaged server-side
- **Real-time detection**: Periodic single-frame recognition from webcam
- **Vector search**: Milvus similarity search (Inner Product over normalized vectors)
- **Privacy**: Only embeddings are stored; raw images are not persisted

## 🧱 Tech Stack

- Backend: Python, Flask, DeepFace (model: VGG-Face, 2622-dim)
- Vector DB: Milvus 2.x (IVF_FLAT, IP)
- Frontend: Next.js (App Router), Tailwind CSS, MediaPipe Tasks Vision
- Docker: `docker-compose.yml` for Milvus + MinIO + etcd

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- Docker Desktop (for Milvus)

### 1) Start Milvus (Docker)
From `face-recognition-app/`:
```bash
docker-compose up -d
```

### 2) Install backend deps
```bash
cd backend
pip install -r requirements.txt
```
Windows helper: run `backend\setup_backend.bat` to create/activate venv and install compatible versions.

### 3) Install frontend deps
```bash
cd ../frontend
npm install
```
Optional: `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4) Start
- One-liner (Windows, from `face-recognition-app/`):
```bash
start_all.bat
```
- Manual:
```bash
# Terminal 1
cd backend
python app.py

# Terminal 2
cd frontend
npm run dev
```

### 5) Open
- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health
- Milvus gRPC: localhost:19530 (no HTTP UI)

## 🧭 UI Walkthrough

- Multi-angle enrollment: On the registration screen, enter a name and start. The UI auto-captures ~10 best frames while you slowly sweep your head; they are uploaded as `angle_0..angle_9` to the backend.
- Real-time detection: Start camera; the app captures single frames periodically and queries `/detect`. A name with confidence appears when matched.

## 🔌 API (Backend)

- `GET /health` → `{ ok: true }` when service and Milvus are healthy
- `POST /register-multi-angle` → form-data
  - fields: `person_name` (or `name`)
  - files: `angle_0`, `angle_1`, ... up to 10 images (jpeg/png)
  - returns: `{ success: true, name, num_images }`
- `POST /detect` → form-data with `image`
  - returns: `{ found: boolean, name?: string, confidence?: number }`

Admin endpoints:
- `GET /admin/faces?limit=50` → `{ total, names: [] }`
- `GET /admin/faces/vector?name=...` → `{ success, name, dim, vector }`
- `DELETE /admin/faces?name=...` → `{ success, deleted }`
- `POST /admin/faces/clear` → Drop and recreate collection

Notes:
- Embedding dimension is 2622 (VGG-Face), not 512
- Similarity uses Inner Product on normalized vectors (cosine-like)
- There is no `/register`, `/video_feed`, or `/stats` endpoint in the backend

## 🗄️ Data & Index

- Collection name: `faces`
- Schema: `pk (INT64 auto_id primary)`, `name (VARCHAR)`, `vector (FLOAT_VECTOR dim=2622)`
- Index: `IVF_FLAT`, metric `IP`, nlist `1024`; query uses nprobe `32`

## ⚙️ Environment

Backend (`app.py`) honors:
- `MILVUS_HOST` (default `127.0.0.1`)
- `MILVUS_PORT` (default `19530`)
- `MILVUS_COLLECTION` (default `faces`)

Frontend:
- `NEXT_PUBLIC_API_URL` (default `http://localhost:5000` if unset)

## 🐳 Docker/Milvus Management

From `face-recognition-app/`:
```bash
docker-compose up -d         # start
docker-compose logs -f       # follow logs
docker-compose ps            # list containers
docker-compose down          # stop
```
Volumes are under `volumes/`.

## 🔎 Troubleshooting / FAQ

- "No matching person found"
  - Ensure at least one person is enrolled; use multi-angle
  - Check Docker containers: `docker ps` (Milvus must be running)
  - Verify backend health: `curl http://localhost:5000/health`
- Backend import/runtime errors on Windows
  - Run `backend\setup_backend.bat` to set up a fresh venv
- Frontend cannot reach backend
  - Confirm port 5000, set `NEXT_PUBLIC_API_URL`, avoid mixed HTTP/HTTPS
- Performance/accuracy
  - Capture in good lighting; keep face ~10–40% of frame; enroll 8–10 angles

## 📂 Project Structure (excerpt)

```
face-recognition-app/
├─ backend/
│  ├─ app.py
│  ├─ requirements.txt
│  └─ setup_backend.bat
├─ frontend/
│  ├─ app/
│  ├─ components/
│  └─ lib/api.js
├─ docker-compose.yml
├─ start_all.bat
└─ volumes/
```

## 📄 License

MIT
