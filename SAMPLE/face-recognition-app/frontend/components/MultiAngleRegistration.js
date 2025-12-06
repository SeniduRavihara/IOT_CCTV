"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function MultiAngleRegistration({ onComplete, onCancel, personName }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const stableFramesRef = useRef(0);
  const captureInProgressRef = useRef(false);
  const pendingCaptureTimeoutRef = useRef(null);
  const lastSpokenRef = useRef(0);
  
  // Auto-sweep mode: capture diverse angles in one continuous pass
  const [autoMode] = useState(true);
  const [currentStep, setCurrentStep] = useState("front"); // legacy, not used
  const [capturedImages, setCapturedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);
  const [instructions, setInstructions] = useState("Keep your face in view and make a slow circular sweep");
  const sweepStartRef = useRef(0);
  const [uniqueCount, setUniqueCount] = useState(0);
  const targetShotsRef = useRef(10);
  const lastShotTimeRef = useRef(0);
  const imagesRef = useRef([]);
  const hasFaceRef = useRef(false);
  const backupTimerRef = useRef(null);

  const steps = [ ];

  const speak = (text) => {
    try {
      const now = Date.now();
      if (now - lastSpokenRef.current < 1200) return; // throttle
      lastSpokenRef.current = now;
      const synth = window.speechSynthesis;
      if (!synth) return;
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 1.05;
      synth.cancel();
      synth.speak(utt);
    } catch (_) {}
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // 1) Open camera FIRST so user sees preview even if model load is slow
        const constraints = { video: { facingMode: "user" }, audio: false };
        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e1) {
          // Retry with generic constraints
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch (_) {}
        }
        
        // 2) Load detector asynchronously; don't block the camera
        ;(async () => {
          try {
            const filesetResolver = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            if (cancelled) return;
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
              filesetResolver,
              {
                baseOptions: {
                  modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                },
                numFaces: 1,
                runningMode: "VIDEO",
              }
            );
          } catch (e) {
            console.warn("FaceLandmarker load failed; preview will still show:", e);
          } finally {
            sweepStartRef.current = performance.now();
            startDetectionLoop();
          }
        })();
      } catch (e) {
        console.error("Failed to initialize webcam:", e);
      }
    };

    if (!isProcessing) {
      init();
    }

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (backupTimerRef.current) {
      clearInterval(backupTimerRef.current);
      backupTimerRef.current = null;
    }
  };

  // Angle logic removed

  const isPositionCorrect = (currentAngle, targetAngle, tolerance) => {
    const pitchDiff = Math.abs(currentAngle.pitch - targetAngle.pitch);
    const yawDiff = Math.abs(currentAngle.yaw - targetAngle.yaw);
    
    return pitchDiff <= tolerance && yawDiff <= tolerance;
  };

  const calculateProgress = (currentAngle, targetAngle, tolerance) => {
    const pitchDiff = Math.abs(currentAngle.pitch - targetAngle.pitch);
    const yawDiff = Math.abs(currentAngle.yaw - targetAngle.yaw);
    
    const pitchProgress = Math.max(0, 100 - (pitchDiff / tolerance) * 100);
    const yawProgress = Math.max(0, 100 - (yawDiff / tolerance) * 100);
    
    // Weight yaw slightly more for left/right steps
    return Math.min(100, Math.max(0, (pitchProgress * 0.4 + yawProgress * 0.6)));
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    if (!video) return null;
    
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const moveToNextStep = () => {
    const currentStepIndex = steps.findIndex(step => step.id === currentStep);
    
    if (currentStepIndex < steps.length - 1) {
      const nextStepIndex = currentStepIndex + 1;
      setCurrentStep(steps[nextStepIndex].id);
      setInstructions(steps[nextStepIndex].instruction);
      speak(steps[nextStepIndex].instruction);
      setStepProgress(0);
      stableFramesRef.current = 0;
      captureInProgressRef.current = false;
      if (pendingCaptureTimeoutRef.current) {
        clearTimeout(pendingCaptureTimeoutRef.current);
        pendingCaptureTimeoutRef.current = null;
      }
    } else {
      // All steps completed
      setIsProcessing(true);
      captureAllAngles();
    }
  };

  const estimateBrightness = (ctx, w, h) => {
    try {
      const sampleW = Math.max(1, Math.floor(w / 8));
      const sampleH = Math.max(1, Math.floor(h / 8));
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
      let sum = 0; let n = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i], g = imgData[i+1], b = imgData[i+2];
        // luminance
        const y = 0.2126*r + 0.7152*g + 0.0722*b;
        sum += y; n++;
      }
      return (sum / n) / 255; // 0..1
    } catch { return 0.5; }
  };

  const computeSharpness = (imgData, w, h) => {
    // Fast gradient magnitude sum as a proxy for sharpness
    let score = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const idxL = (y * w + (x - 1)) * 4;
        const idxR = (y * w + (x + 1)) * 4;
        const idxT = ((y - 1) * w + x) * 4;
        const idxB = ((y + 1) * w + x) * 4;
        const gX = (imgData[idxR] - imgData[idxL]) + (imgData[idxR+1] - imgData[idxL+1]) + (imgData[idxR+2] - imgData[idxL+2]);
        const gY = (imgData[idxB] - imgData[idxT]) + (imgData[idxB+1] - imgData[idxT+1]) + (imgData[idxB+2] - imgData[idxT+2]);
        score += Math.abs(gX) + Math.abs(gY);
      }
    }
    return score / (w * h);
  };

  const captureBurstPickBest = async () => {
    const video = videoRef.current;
    if (!video) return null;
    const off = document.createElement("canvas");
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const octx = off.getContext("2d");

    let best = { score: -Infinity, dataUrl: null };
    const frames = 3;
    for (let i = 0; i < frames; i++) {
      octx.drawImage(video, 0, 0, off.width, off.height);
      // downscale for sharpness estimate
      const sw = Math.max(64, Math.floor(off.width / 6));
      const sh = Math.max(64, Math.floor(off.height / 6));
      const tmp = document.createElement("canvas");
      tmp.width = sw; tmp.height = sh;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(off, 0, 0, sw, sh);
      const data = tctx.getImageData(0, 0, sw, sh).data;
      const sharp = computeSharpness(data, sw, sh);
      const dataUrl = off.toDataURL("image/jpeg", 0.92);
      if (sharp > best.score) best = { score: sharp, dataUrl };
      if (i < frames - 1) await new Promise(r => setTimeout(r, 70));
    }
    return best;
  };

  const captureAllAngles = async () => {
    try {
      const formData = new FormData();
      formData.append('person_name', personName);
      formData.append('registration_type', 'multi_angle');
      
      // Add all captured images
      (imagesRef.current.length ? imagesRef.current : capturedImages).slice(0, targetShotsRef.current).forEach((imageData, index) => {
        const blob = dataURLToBlob(imageData);
        formData.append(`angle_${index}`, blob, `angle_${index}.jpg`);
      });
      
      const response = await fetch('http://localhost:5000/register-multi-angle', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        onComplete(result);
      } else {
        alert(`Registration failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Multi-angle registration failed:', error);
      alert('Multi-angle registration failed');
    } finally {
      cleanup();
    }
  };

  const dataURLToBlob = (dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const drawDetection = (landmarks) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) {
      hasFaceRef.current = false;
      setStepProgress(0);
      stableFramesRef.current = 0;
      return;
    }
    hasFaceRef.current = true;
    // Compute bounding box from landmarks of the first face
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    const face = landmarks[0];
    face.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    const x = minX * canvas.width;
    const y = minY * canvas.height;
    const w = (maxX - minX) * canvas.width;
    const h = (maxY - minY) * canvas.height;
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Draw minimal mesh keypoints for user feedback
    ctx.fillStyle = "#10b981";
    const keyPoints = [1, 33, 263, 13, 61, 291];
    keyPoints.forEach((idx) => {
      const p = face[idx];
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw progress circle and guidance
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 60;
    
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Additional guidance text
    ctx.fillStyle = "#111827";
    ctx.font = `600 ${Math.min(canvas.width * 0.035, 18)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(instructions, centerX, centerY + radius + 24);

    const faceAreaRatio = (w * h) / (canvas.width * canvas.height);

    // brightness check
    const brightness = estimateBrightness(ctx, canvas.width, canvas.height);

    // Simple presence-based capture
    const REQUIRED_STABLE_FRAMES = 1;
    const MIN_FACE_AREA = 0.02; // relaxed
    const MIN_BRIGHTNESS = 0.05; // relaxed
    const MAX_BRIGHTNESS = 0.98;
    const qualityOk = faceAreaRatio >= MIN_FACE_AREA && brightness >= MIN_BRIGHTNESS && brightness <= MAX_BRIGHTNESS;

    if (qualityOk && !isProcessing) {
      stableFramesRef.current += 1;
      const cooldownOk = performance.now() - lastShotTimeRef.current > 250;
      const needsMore = (imagesRef.current?.length || 0) < targetShotsRef.current;
      if (needsMore && cooldownOk && stableFramesRef.current >= REQUIRED_STABLE_FRAMES && !captureInProgressRef.current) {
        captureInProgressRef.current = true;
        setTimeout(async () => {
          const best = await captureBurstPickBest();
          if (best && best.dataUrl) {
            // Push to ref to avoid stale state during rapid captures
            imagesRef.current = (imagesRef.current || []).concat(best.dataUrl);
            const count = imagesRef.current.length;
            setCapturedImages(imagesRef.current.slice());
            setUniqueCount(count);
            lastShotTimeRef.current = performance.now();
          }
          captureInProgressRef.current = false;
          stableFramesRef.current = 0;

          // If enough shots captured, finish and submit automatically
          if ((imagesRef.current?.length || 0) >= targetShotsRef.current) {
            setIsProcessing(true);
            // Submit exactly 10 frames captured
            captureAllAngles();
          }
        }, 0);
      }
    } else {
      stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
    }
  };

  const startDetectionLoop = () => {
    const detect = () => {
      const video = videoRef.current;
      if (!video || !faceLandmarkerRef.current || isProcessing) {
        if (!isProcessing) {
          rafRef.current = requestAnimationFrame(detect);
        }
        return;
      }

      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
      const faces = results?.faceLandmarks || [];
      drawDetection(faces);
      
      if (streamRef.current && !isProcessing) {
        // throttle slightly to allow stable frame counting on slower devices
        rafRef.current = requestAnimationFrame(detect);
      }
    };
    detect();

    // Backup timed capture if quality checks are too strict
    if (!backupTimerRef.current) {
      backupTimerRef.current = setInterval(async () => {
        if (isProcessing) return;
        const haveFace = hasFaceRef.current;
        const count = imagesRef.current?.length || 0;
        if (!haveFace || count >= targetShotsRef.current) return;
        const now = performance.now();
        if (now - lastShotTimeRef.current < 700) return;
        captureInProgressRef.current = true;
        const best = await captureBurstPickBest();
        if (best && best.dataUrl) {
          imagesRef.current = (imagesRef.current || []).concat(best.dataUrl);
          const n = imagesRef.current.length;
          setCapturedImages(imagesRef.current.slice());
          setUniqueCount(n);
          lastShotTimeRef.current = now;
          if (n >= targetShotsRef.current) {
            setIsProcessing(true);
            captureAllAngles();
          }
        }
        captureInProgressRef.current = false;
      }, 800);
    }
  };

  const currentStepData = steps.find(step => step.id === currentStep);
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  // Overall progress based on number of shots captured
  const overallProgress = Math.min(100, Math.round((uniqueCount / targetShotsRef.current) * 100));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="card-neon blue p-8 max-w-4xl w-full mx-4 text-slate-200">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-sky-300 mb-2">
            Secure Face Enrollment
          </h2>
          <p className="text-slate-400 mb-4">
            Registering: <span className="font-semibold text-slate-200">{personName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gutter-8">
          {/* Camera Feed */}
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900/40">
              {!isProcessing ? (
                <>
                  <video 
                    ref={videoRef} 
                    className="w-full h-64 object-cover"
                    muted 
                    playsInline 
                  />
                  <canvas 
                    ref={canvasRef} 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4"></div>
                    <p className="text-slate-300">Processing registration...</p>
                  </div>
                </div>
              )}
            </div>

          {/* Status with counter */}
            <div className="text-center">
              <h3 className="text-xl font-semibold text-sky-300 mb-2">Capturing automatically</h3>
              <p className="text-slate-400 mb-1">{instructions}</p>
              <p className="text-emerald-300 font-semibold">{Math.min(uniqueCount, targetShotsRef.current)} / {targetShotsRef.current}</p>
            </div>
          </div>

          {/* Tips */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-200">Tips</h3>
            <ul className="list-disc pl-6 text-sm text-slate-400 space-y-1">
              <li>Hold phone/face steady; slowly sweep left → right and up ↕ down</li>
              <li>Ensure your face fills at least 10% of the frame</li>
              <li>Avoid backlight; keep your face evenly lit</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800/50"
          >
            Cancel
          </button>
          {uniqueCount > 0 && uniqueCount < targetShotsRef.current && (
            <button
              onClick={captureAllAngles}
              disabled={isProcessing}
              className="btn-neon green px-6 py-2 bg-emerald-500 text-white rounded-lg disabled:opacity-50"
            >
              Complete Registration
            </button>
          )}
          {uniqueCount >= targetShotsRef.current && (
            <button
              onClick={captureAllAngles}
              disabled={isProcessing}
              className="btn-neon green px-6 py-2 bg-emerald-500 text-white rounded-lg disabled:opacity-50"
            >
              Submitting 10 images...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
