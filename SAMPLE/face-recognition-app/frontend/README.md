# Face Recognition System

A modern, AI-powered face recognition web application built with Next.js and Python Flask backend.

## Features

- **Beautiful Modern UI**: Clean, responsive design with gradient backgrounds and smooth animations
- **Person Registration**: Upload photos and register new persons in the system
- **Real-time Face Detection**: Use webcam to detect and identify registered persons
- **AI-Powered Recognition**: Advanced face recognition using deep learning models
- **Cloud Storage**: Images stored securely in Cloudinary
- **Vector Database**: Fast similarity search using Milvus

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Inter Font** - Modern, readable typography
- **WebRTC** - Webcam access and video processing

### Backend
- **Python Flask** - Web framework
- **OpenCV** - Computer vision library
- **DeepFace** - Face recognition library
- **Milvus** - Vector database for similarity search
- **Cloudinary** - Cloud image storage

## Quick Start

### Prerequisites

1. **Install Python** (3.8 or higher)
   ```bash
   # Windows - Download from python.org or use Microsoft Store
   # Make sure to check "Add Python to PATH" during installation
   ```

2. **Install Node.js** (18 or higher)
   ```bash
   # Download from nodejs.org
   ```

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd face-recognition-app
   ```

2. **Install Python dependencies**
   ```bash
   pip install flask opencv-python deepface pymilvus cloudinary
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

### Running the Application

1. **Start the Python backend**
   ```bash
   cd backend
   python app.py
   ```
   The backend will run on `http://localhost:5000`

2. **Start the Next.js frontend** (in a new terminal)
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Registering a New Person

1. **Enter the person's full name** in the name input field
2. **Upload a clear photo** by clicking the upload area or dragging a file
3. **Click "Register Person"** to add them to the system
4. **Wait for success message** confirming the registration

### Face Detection

1. **Click "Start Detection"** to activate your webcam
2. **Position your face** in the camera view
3. **Click "Capture & Detect"** to identify the person
4. **View the results** showing the person's name and confidence level
5. **Click "Stop"** to close the webcam

## Project Structure

```
face-recognition-app/
├── app/                    # Next.js app directory
│   ├── page.js            # Main homepage
│   ├── layout.js          # Root layout
│   └── globals.css        # Global styles
├── backend/               # Python Flask backend
│   ├── app.py            # Main Flask application
│   ├── face_recognition.py # Face recognition logic
│   └── milvus_client.py  # Database client
├── components/            # React components
├── lib/                   # Utility functions
│   └── api.js            # API communication
└── public/               # Static assets
```

## Configuration

### Cloudinary Setup
1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Get your cloud name and upload preset
3. Update the upload preset in the code if needed

### Milvus Database
The application uses Milvus for vector similarity search. Make sure Milvus is running:
```bash
# Using Docker Compose (if available)
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **"pip not recognized"**
   - Install Python from python.org and check "Add to PATH"
   - Or use Microsoft Store version

2. **Webcam not working**
   - Check browser permissions for camera access
   - Make sure no other app is using the camera

3. **Backend connection failed**
   - Ensure Python backend is running on port 5000
   - Check firewall settings

4. **Face detection not working**
   - Ensure good lighting conditions
   - Make sure face is clearly visible in camera
   - Check if person is registered in the system

### Development

- **Frontend**: `npm run dev` (runs on port 3000)
- **Backend**: `python app.py` (runs on port 5000)
- **Build**: `npm run build`
- **Production**: `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the code comments
3. Create an issue in the repository

---

**Note**: This is a demonstration application. For production use, implement proper security measures, error handling, and data validation.
