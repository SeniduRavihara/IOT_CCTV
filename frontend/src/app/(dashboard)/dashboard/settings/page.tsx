"use client";

import { Card } from "@/components/ui/Card";
import { Bell, Shield, UserCheck, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [alertKnown, setAlertKnown] = useState(false);
  const [flashlight, setFlashlight] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch current setting on mount (You might need a GET endpoint or just default to false)
  // Since we don't have a GET endpoint for this specific setting yet, we'll default to false
  // or we can add a GET endpoint to main.py. For now, let's assume false.
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Fetch alertKnown state
        const alertKnownResponse = await fetch("http://localhost:5001/settings/alert-known");
        if (alertKnownResponse.ok) {
          const data = await alertKnownResponse.json();
          setAlertKnown(data.enabled);
        } else {
          console.error("Failed to fetch alertKnown setting");
        }

        // Fetch flashlight state
        const flashlightResponse = await fetch("http://localhost:5001/settings/flashlight");
        if (flashlightResponse.ok) {
          const data = await flashlightResponse.json();
          setFlashlight(data.enabled);
        } else {
          console.error("Failed to fetch flashlight setting");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const toggleAlertKnown = async () => {
    setLoading(true);
    try {
      const newState = !alertKnown;
      const response = await fetch("http://localhost:5001/settings/alert-known", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: newState }),
      });

      if (response.ok) {
        setAlertKnown(newState);
      } else {
        console.error("Failed to update setting");
      }
    } catch (error) {
      console.error("Error updating setting:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlashlight = async () => {
    try {
      const newState = !flashlight;
      const response = await fetch("http://localhost:5001/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ led: newState }),
      });

      if (response.ok) {
        setFlashlight(newState);
      } else {
        console.error("Failed to toggle flashlight");
      }
    } catch (error) {
      console.error("Error toggling flashlight:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Configure your security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Settings Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Security Rules</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">Known Person Alerts</h3>
                  <p className="text-sm text-slate-400">
                    Receive notifications when registered family members are detected.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={alertKnown}
                  onChange={toggleAlertKnown}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Placeholder for other settings */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 opacity-50 cursor-not-allowed">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">Push Notifications</h3>
                  <p className="text-sm text-slate-400">
                    Send alerts to mobile device (Coming Soon)
                  </p>
                </div>
              </div>
              <div className="w-11 h-6 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </Card>

        {/* Camera Controls Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Lightbulb className="h-6 w-6 text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Camera Controls</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-slate-400 mt-1" />
                <div>
                  <h3 className="font-medium text-white">Camera Flashlight</h3>
                  <p className="text-sm text-slate-400">
                    Turn on the ESP32-CAM high-power LED.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={flashlight}
                  onChange={toggleFlashlight}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
