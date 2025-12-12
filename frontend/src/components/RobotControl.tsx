"use client";

import { Button } from "@/components/ui/Button";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Lightbulb,
  LightbulbOff,
} from "lucide-react";
import { MutableRefObject, useState } from "react";

interface RobotControlProps {
  wsRef?: MutableRefObject<WebSocket | null>;
}

export function RobotControl({ wsRef }: RobotControlProps) {
  const [pan, setPan] = useState(90);
  const [tilt, setTilt] = useState(90);
  const [ledOn, setLedOn] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const sendCommand = (newPan: number, newTilt: number) => {
    // Clamp values
    const clampedPan = Math.min(180, Math.max(0, newPan));
    const clampedTilt = Math.min(180, Math.max(0, newTilt));

    setPan(clampedPan);
    setTilt(clampedTilt);

    // Send via WebSocket if available, otherwise fallback to HTTP
    if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(`pan:${clampedPan}`);
      wsRef.current.send(`tilt:${clampedTilt}`);
    } else {
      // Fallback to HTTP for backward compatibility
      fetch("http://127.0.0.1:5001/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan: clampedPan, tilt: clampedTilt }),
      }).catch((error) => console.error("Failed to send command:", error));
    }
  };

  const handleMove = (axis: "pan" | "tilt", direction: number) => {
    const step = 10;
    if (axis === "pan") {
      sendCommand(pan + direction * step, tilt);
    } else {
      sendCommand(pan, tilt + direction * step);
    }
  };

  const handleCenter = () => {
    sendCommand(90, 90);
  };

  const toggleLed = () => {
    const newLedState = !ledOn;
    setLedOn(newLedState);

    if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(`led:${newLedState ? 1 : 0}`);
    } else {
      // Fallback to HTTP
      fetch("http://127.0.0.1:5001/led", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: newLedState ? 1 : 0 }),
      }).catch((error) => console.error("Failed to control LED:", error));
    }
  };

  const toggleAi = () => {
    const newAiState = !aiEnabled;
    setAiEnabled(newAiState);

    if (wsRef?.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(`ai:${newAiState ? 1 : 0}`);
      console.log(`AI Detection ${newAiState ? "ENABLED" : "DISABLED"}`);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48 bg-slate-800/50 rounded-full border border-slate-700 flex items-center justify-center">
        {/* Up (Tilt -) */}
        <Button
          variant="secondary"
          className="absolute top-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove("tilt", -1)}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>

        {/* Down (Tilt +) */}
        <Button
          variant="secondary"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove("tilt", 1)}
        >
          <ArrowDown className="h-5 w-5" />
        </Button>

        {/* Left (Pan +) */}
        <Button
          variant="secondary"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove("pan", 1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Right (Pan -) */}
        <Button
          variant="secondary"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full p-0"
          onClick={() => handleMove("pan", -1)}
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

      <div className="mt-4 flex gap-4 items-center">
        <div className="flex gap-4 text-xs text-slate-400">
          <span>Pan: {pan}°</span>
          <span>Tilt: {tilt}°</span>
        </div>

        {/* LED Toggle Button */}
        <Button
          variant={ledOn ? "primary" : "secondary"}
          className="h-8 w-8 rounded-full p-0"
          onClick={toggleLed}
          title={ledOn ? "Turn LED Off" : "Turn LED On"}
        >
          {ledOn ? (
            <Lightbulb className="h-4 w-4 text-yellow-300" />
          ) : (
            <LightbulbOff className="h-4 w-4" />
          )}
        </Button>

        {/* AI Detection Toggle Button */}
        <Button
          variant={aiEnabled ? "primary" : "secondary"}
          className="h-8 px-3 text-xs font-medium"
          onClick={toggleAi}
          title={aiEnabled ? "Disable AI Detection" : "Enable AI Detection"}
        >
          AI {aiEnabled ? "ON" : "OFF"}
        </Button>
      </div>
    </div>
  );
}
