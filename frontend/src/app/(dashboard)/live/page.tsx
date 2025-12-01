"use client";

import { Card } from "@/components/ui/Card";
import { AlertCircle, Camera, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function LiveFeedPage() {
  const [streamUrl, setStreamUrl] = useState("http://localhost:5000/stream");
  const [error, setError] = useState(false);

  const handleRetry = () => {
    setError(false);
    // Force reload image by appending timestamp
    setStreamUrl(`http://localhost:5000/stream?t=${Date.now()}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Live Feed</h1>
        <p className="text-gray-400">Real-time video stream from the camera.</p>
      </div>

      <Card className="p-4">
        <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden flex items-center justify-center border border-gray-800">
          {!error ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={streamUrl}
              alt="Live Stream"
              className="w-full h-full object-contain"
              onError={() => setError(true)}
            />
          ) : (
            <div className="text-center p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-100 mb-2">Stream Offline</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Unable to connect to the camera stream. Ensure the camera simulator (or ESP32) is running and accessible.
              </p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-xs text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </button>
            </div>
          )}
          
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${!error ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-xs font-medium text-white">
              {!error ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs uppercase font-semibold mb-1">Status</div>
                <div className="text-gray-100 font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4 text-blue-400" />
                    {!error ? "Streaming" : "Disconnected"}
                </div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs uppercase font-semibold mb-1">Source</div>
                <div className="text-gray-100 font-medium">Local Simulator</div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs uppercase font-semibold mb-1">Resolution</div>
                <div className="text-gray-100 font-medium">640 x 480 (MJPEG)</div>
            </div>
        </div>
      </Card>
    </div>
  );
}
