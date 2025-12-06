"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Gamepad2 } from "lucide-react";
import { useState } from "react";

export default function RobotPage() {
  const [pan, setPan] = useState(90);
  const [tilt, setTilt] = useState(90);
  const [loading, setLoading] = useState(false);

  const sendCommand = async (newPan: number, newTilt: number) => {
    // Clamp values
    const clampedPan = Math.min(180, Math.max(0, newPan));
    const clampedTilt = Math.min(180, Math.max(0, newTilt));
    
    setPan(clampedPan);
    setTilt(clampedTilt);
    setLoading(true);

    try {
      await fetch("http://127.0.0.1:5001/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan: clampedPan, tilt: clampedTilt }),
      });
    } catch (error) {
      console.error("Failed to send command:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = (axis: 'pan' | 'tilt', direction: number) => {
    const step = 10;
    if (axis === 'pan') {
      sendCommand(pan + (direction * step), tilt);
    } else {
      sendCommand(pan, tilt + (direction * step));
    }
  };

  const handleCenter = () => {
    sendCommand(90, 90);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Robot Control</h1>
        <p className="text-slate-400 mt-1">
          Remote control for Pan/Tilt Camera Mount
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Control Pad */}
        <Card className="p-6 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-64 h-64 bg-slate-800/50 rounded-full border border-slate-700 flex items-center justify-center">
            {/* Up (Tilt -) */}
            <Button
              variant="secondary"
              className="absolute top-4 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full p-0"
              onClick={() => handleMove('tilt', -1)}
            >
              <ArrowUp className="h-6 w-6" />
            </Button>

            {/* Down (Tilt +) */}
            <Button
              variant="secondary"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full p-0"
              onClick={() => handleMove('tilt', 1)}
            >
              <ArrowDown className="h-6 w-6" />
            </Button>

            {/* Left (Pan +) - Depends on servo orientation, usually left increases angle or vice versa */}
            <Button
              variant="secondary"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full p-0"
              onClick={() => handleMove('pan', 1)}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>

            {/* Right (Pan -) */}
            <Button
              variant="secondary"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full p-0"
              onClick={() => handleMove('pan', -1)}
            >
              <ArrowRight className="h-6 w-6" />
            </Button>

            {/* Center */}
            <Button
              variant="primary"
              className="h-16 w-16 rounded-full p-0 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              onClick={handleCenter}
            >
              <Crosshair className="h-8 w-8" />
            </Button>
          </div>
          
          <p className="mt-8 text-slate-400 text-sm">
            Use the D-Pad to move the camera
          </p>
        </Card>

        {/* Status / Info */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-blue-400" />
              Servo Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Pan Angle (Horizontal)</span>
                <span className="text-white font-mono">{pan}°</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(pan / 180) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Tilt Angle (Vertical)</span>
                <span className="text-white font-mono">{tilt}°</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${(tilt / 180) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Commands are sent to the server and picked up by the ESP32 on its next sync cycle.
                Latency depends on the camera's upload interval.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
