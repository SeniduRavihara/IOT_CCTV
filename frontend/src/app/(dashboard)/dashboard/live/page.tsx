"use client";

import { RobotControl } from "@/components/RobotControl";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { Camera } from "@/lib/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Maximize2, Minimize2, Video, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function LiveCameraCard({ camera }: { camera: Camera }) {
  const [isOnline, setIsOnline] = useState(true);
  const [imgError, setImgError] = useState(false);

  // For the simulator demo, we force it to localhost:5000
  // In a real deployment, this would be `http://${camera.ipAddress}/stream`
  const streamUrl = "http://localhost:5001/video_feed";

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Card className="overflow-hidden">
      {/* Camera Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isOnline ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{camera.name}</h3>
            <p className="text-xs text-slate-400">{camera.location}</p>
          </div>
        </div>
        <Badge variant={isOnline ? "success" : "danger"}>
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {/* Camera Feed */}
      <div ref={containerRef} className="relative aspect-video bg-slate-900 group">
        {!imgError ? (
          <img
            src={streamUrl}
            alt={`Live feed from ${camera.name}`}
            className="w-full h-full object-contain"
            onError={() => {
              setImgError(true);
              setIsOnline(false);
            }}
            onLoad={() => {
              setIsOnline(true);
              setImgError(false);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <WifiOff className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Camera offline</p>
              <button
                onClick={() => setImgError(false)}
                className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isOnline && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-white">LIVE</span>
          </div>
        )}

        {/* Fullscreen Toggle */}
        {isOnline && (
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Robot Control Overlay (Visible in Fullscreen or Normal) */}
        {isOnline && (
            <div className={`absolute bottom-4 left-4 transition-opacity duration-300 ${isFullscreen ? 'opacity-0 group-hover:opacity-100' : ''}`}>
                <div className="bg-black/40 backdrop-blur-sm p-2 rounded-2xl border border-white/10 scale-75 origin-bottom-left">
                    <RobotControl />
                </div>
            </div>
        )}
      </div>

      {/* Camera Controls (Info only now) */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-slate-400 block">
            Detection: {camera.settings?.detectionEnabled ? "Active" : "Paused"}
          </span>
          <span className="text-slate-400 block">
            Sensitivity: {camera.settings?.motionSensitivity || 50}%
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function LivePage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "cameras"),
      where("settings.detectionEnabled", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camerasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Camera[];

      setCameras(camerasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Live Cameras</h1>
        <p className="text-slate-400 mt-1">
          Monitor real-time feeds from your cameras
        </p>
      </div>

      {/* Camera Grid */}
      {cameras.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No active cameras
          </h3>
          <p className="text-slate-400">
            Enable detection on cameras to view live feeds
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cameras.map((camera) => (
            <LiveCameraCard key={camera.id} camera={camera} />
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="p-6 bg-blue-500/10 border-blue-500/20">
        <div className="flex items-start gap-3">
          <Video className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-400 mb-1">
              Live Feed Information
            </h4>
            <p className="text-sm text-slate-300">
              Live camera feeds require WebRTC connection to ESP32-CAM devices.
              Make sure your cameras are properly configured and connected to
              the network. For best performance, use cameras on the same local
              network.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

