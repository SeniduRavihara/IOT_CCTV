"use client";

import { Button } from "@/components/ui/Button";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair } from "lucide-react";
import { useState } from "react";

export function RobotControl() {
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
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48 bg-slate-800/50 rounded-full border border-slate-700 flex items-center justify-center">
        {/* Up (Tilt -) */}
        <Button
          variant="secondary"
          className="absolute top-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove('tilt', -1)}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>

        {/* Down (Tilt +) */}
        <Button
          variant="secondary"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove('tilt', 1)}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>

        {/* Left (Pan +) */}
        <Button
          variant="secondary"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove('pan', 1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Right (Pan -) */}
        <Button
          variant="secondary"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove('pan', -1)}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>

        {/* Center */}
        <Button
          variant="primary"
          className="h-12 w-12 rounded-full p-0 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
          onClick={handleCenter}
        >
          <Crosshair className="h-6 w-6" />
        </Button>
      </div>
      
      <div className="mt-4 flex gap-4 text-xs text-slate-400">
        <span>Pan: {pan}°</span>
        <span>Tilt: {tilt}°</span>
      </div>
    </div>
  );
}
