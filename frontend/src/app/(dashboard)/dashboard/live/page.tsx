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
  const [isOnline, setIsOnline] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false); // Start with AI OFF
  const [autoConnect, setAutoConnect] = useState(true); // Auto-connect by default
  const imgRef = useRef<HTMLImageElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket stream for real-time control
  const esp32IP = camera.ipAddress || "192.168.43.223";

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

  const toggleAi = () => {
    const newAiState = !aiEnabled;
    setAiEnabled(newAiState);

    if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(`ai:${newAiState ? 1 : 0}`);
      console.log(`🤖 AI Detection ${newAiState ? "ENABLED" : "DISABLED"}`);
    } else {
      console.warn("WebSocket not connected - AI toggle failed");
    }
  };

  const manualConnect = () => {
    setAutoConnect(true);
  };

  const manualDisconnect = () => {
    setAutoConnect(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  };

  // WebSocket connection effect with robust reconnection
  useEffect(() => {
    if (!autoConnect) return; // Only connect if autoConnect is true

    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    let isComponentMounted = true;

    const connectWebSocket = () => {
      if (!isComponentMounted) return;

      // Close existing connection if any
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          console.log("Error closing old WebSocket:", e);
        }
        wsRef.current = null;
      }

      try {
        console.log(
          `🔌 Attempting WebSocket connection to ${esp32IP}:81 (attempt ${
            reconnectAttempts + 1
          })...`
        );
        const ws = new WebSocket(`ws://${esp32IP}:81`);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        // Connection timeout - if not connected in 5 seconds, retry
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.warn("⏱️ Connection timeout - retrying...");
            ws.close();
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          reconnectAttempts = 0; // Reset counter on success
          console.log("✅ WebSocket connected to ESP32");
          setWsConnected(true);
          setIsOnline(true);
        };

        ws.onmessage = (event) => {
          // Handle keepalive ping from ESP32
          if (typeof event.data === "string" && event.data === "ping") {
            ws.send("pong");
            console.log("🔄 Keepalive: received ping, sent pong");
            return;
          }

          if (event.data instanceof ArrayBuffer && event.data.byteLength > 0) {
            // Binary frame - display as image
            const blob = new Blob([event.data], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);

            if (imgRef.current) {
              if (
                imgRef.current.src &&
                imgRef.current.src.startsWith("blob:")
              ) {
                URL.revokeObjectURL(imgRef.current.src);
              }
              imgRef.current.src = url;
              imgRef.current.onload = () => {
                if (url.startsWith("blob:")) {
                  URL.revokeObjectURL(url);
                }
              };
            }
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("❌ WebSocket error:", error);
          setIsOnline(false);
          setWsConnected(false);
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);

          // Detailed close code diagnostics
          const closeReasons: Record<number, string> = {
            1000: "Normal closure",
            1001: "Going away (page refresh/navigation)",
            1006: "Abnormal closure (no close frame - network/crash)",
            1008: "Policy violation",
            1009: "Message too big",
            1011: "Server error",
          };

          const reason = closeReasons[event.code] || event.reason || "Unknown";
          console.log(`🔌 WebSocket closed - Code: ${event.code} (${reason})`);

          setWsConnected(false);
          setIsOnline(false);

          // Exponential backoff: 1s, 2s, 4s, max 10s
          reconnectAttempts++;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts - 1),
            10000
          );

          console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
          reconnectTimeout = setTimeout(connectWebSocket, delay);
        };
      } catch (error) {
        console.error("❌ Failed to create WebSocket:", error);
        setIsOnline(false);
        setWsConnected(false);

        reconnectAttempts++;
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts - 1),
          10000
        );
        reconnectTimeout = setTimeout(connectWebSocket, delay);
      }
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [esp32IP, autoConnect]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <Card className="overflow-hidden">
      {/* Camera Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              wsConnected ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            {wsConnected ? (
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
        <div className="flex items-center gap-3">
          {/* Connect/Disconnect Button */}
          <button
            onClick={wsConnected ? manualDisconnect : manualConnect}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              wsConnected
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
            }`}
          >
            {wsConnected ? "🔌 Disconnect" : "🔌 Connect"}
          </button>

          {/* AI Detection Toggle - Always visible */}
          <button
            onClick={toggleAi}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              aiEnabled
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700/70"
            }`}
            title={aiEnabled ? "Disable AI Detection" : "Enable AI Detection"}
          >
            🤖 AI {aiEnabled ? "ON" : "OFF"}
          </button>
          <Badge variant={wsConnected ? "success" : "danger"}>
            {wsConnected ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* Camera Feed */}
      <div
        ref={containerRef}
        className="relative aspect-video bg-slate-900 group"
      >
        {!wsConnected ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <WifiOff className="h-16 w-16 text-slate-600 mx-auto" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>
              </div>
              <p className="text-slate-400 font-medium">
                Connecting to camera...
              </p>
              <p className="text-xs text-slate-500 mt-2">
                ESP32 @ {esp32IP}:81
              </p>
              <div className="mt-4 flex items-center justify-center gap-1">
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Auto-reconnecting with exponential backoff
              </p>
            </div>
          </div>
        ) : (
          <img
            ref={imgRef}
            alt={`Live feed from ${camera.name}`}
            className="w-full h-full object-contain bg-black"
          />
        )}

        {/* Recording Indicator */}
        {wsConnected && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-white">LIVE</span>
          </div>
        )}

        {/* Fullscreen Toggle */}
        {wsConnected && (
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

        {/* Robot Control Overlay (Always available - no pause needed!) */}
        {wsConnected && (
          <div
            className={`absolute bottom-4 left-4 transition-opacity duration-300 ${
              isFullscreen ? "opacity-0 group-hover:opacity-100" : ""
            }`}
          >
            <div className="bg-black/40 backdrop-blur-sm p-2 rounded-2xl border border-white/10 scale-75 origin-bottom-left">
              <RobotControl wsRef={wsRef} />
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
