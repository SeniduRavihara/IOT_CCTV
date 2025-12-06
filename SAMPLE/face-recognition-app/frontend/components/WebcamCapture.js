"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function WebcamCapture({ active = false, onCapture }) {
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState(null);
	const faceLandmarkerRef = useRef(null);
	const rafRef = useRef(null);
	const lastAutoCaptureRef = useRef(0);
	const streamRef = useRef(null);

	useEffect(() => {
		let cancelled = false;

		const init = async () => {
			try {
				const filesetResolver = await FilesetResolver.forVisionTasks(
					"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
				);
				if (cancelled) return;
				faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
					filesetResolver,
					{
						baseOptions: {
							modelAssetPath:
								"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
						},
						numFaces: 1,
						runningMode: "VIDEO",
					}
				);

				const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
				if (cancelled) {
					stream.getTracks().forEach((t) => t.stop());
					return;
				}
				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();
				}
				setIsReady(true);
				startDetectionLoop();
			} catch (e) {
				setError(e?.message || "Failed to initialize webcam");
			}
		};

		const teardown = () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((t) => t.stop());
				streamRef.current = null;
			}
			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}
			setIsReady(false);
		};

		if (active) {
			init();
		} else {
			teardown();
		}

		return () => {
			cancelled = true;
			teardown();
		};
	}, [active]);

	const drawLandmarks = (landmarks) => {
		const canvas = canvasRef.current;
		const video = videoRef.current;
		if (!canvas || !video) return;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.strokeStyle = "#22d3ee";
		ctx.fillStyle = "#22d3ee";
		ctx.lineWidth = 1.5;

		for (const face of landmarks) {
			for (const pt of face) {
				ctx.beginPath();
				ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 1.8, 0, Math.PI * 2);
				ctx.fill();
			}
			const connect = (a, b) => {
				ctx.beginPath();
				ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
				ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
				ctx.stroke();
			};
			const idxs = [
				[33, 168], [168, 197], [197, 5],
				[263, 417], [417, 401], [401, 5],
				[61, 146], [146, 91], [91, 181], [181, 84], [84, 17],
				[291, 375], [375, 321], [321, 405], [405, 315], [315, 17],
			];
			for (const [i, j] of idxs) {
				if (face[i] && face[j]) connect(face[i], face[j]);
			}
		}
	};

	const autoCaptureIfFaceStable = (hasFace) => {
		const now = performance.now();
		const cooldownMs = 2500;
		if (!hasFace) return;
		if (now - lastAutoCaptureRef.current < cooldownMs) return;
		lastAutoCaptureRef.current = now;
		doCapture();
	};

	const doCapture = () => {
		const video = videoRef.current;
		if (!video) return;
		const off = document.createElement("canvas");
		off.width = video.videoWidth;
		off.height = video.videoHeight;
		const ctx = off.getContext("2d");
		ctx.drawImage(video, 0, 0, off.width, off.height);
		const dataUrl = off.toDataURL("image/jpeg", 0.9);
		if (onCapture) onCapture(dataUrl);
	};

	const startDetectionLoop = () => {
		const detect = () => {
			const video = videoRef.current;
			if (!video || !faceLandmarkerRef.current) {
				rafRef.current = requestAnimationFrame(detect);
				return;
			}
			const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
			const faces = results?.faceLandmarks || [];
			drawLandmarks(faces);
			autoCaptureIfFaceStable(faces.length > 0);
			if (streamRef.current) {
				rafRef.current = requestAnimationFrame(detect);
			}
		};
		detect();
	};

	return (
		<div style={{ position: "relative", width: "100%", maxWidth: 640 }}>
			{error && (
				<div style={{ color: "#f87171", marginBottom: 8 }}>{error}</div>
			)}
			<div className="bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
				{active ? (
					<video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
				) : (
					<div className="text-center text-gray-500">
						<p>Camera is off. Click Start to begin.</p>
					</div>
				)}
			</div>
			<canvas ref={canvasRef} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
		</div>
	);
}
