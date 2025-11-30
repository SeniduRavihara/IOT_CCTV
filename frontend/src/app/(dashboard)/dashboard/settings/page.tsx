"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Lock, Mail, Save, Shield, Sliders, User } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [detectionThreshold, setDetectionThreshold] = useState(0.6);
  const [captureInterval, setCaptureInterval] = useState(30);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved successfully!");
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your preferences and system configuration
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <User className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Profile Settings
            </h2>
            <p className="text-sm text-slate-400">
              Manage your account information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={user?.email || ""}
            disabled
          />
          <Input label="Display Name" type="text" placeholder="Your name" />
          <Button variant="primary">Update Profile</Button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Bell className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
            <p className="text-sm text-slate-400">
              Choose how you want to be notified
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Email Notifications</p>
              <p className="text-sm text-slate-400">Receive alerts via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Push Notifications</p>
              <p className="text-sm text-slate-400">
                Receive browser notifications
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <Input
            label="Notification Email"
            type="email"
            placeholder="alerts@example.com"
          />
        </div>
      </Card>

      {/* Detection Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Sliders className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Detection Settings
            </h2>
            <p className="text-sm text-slate-400">
              Configure AI detection parameters
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Recognition Threshold: {detectionThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={detectionThreshold}
              onChange={(e) =>
                setDetectionThreshold(parseFloat(e.target.value))
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-2">
              Lower = more sensitive (more false positives) | Higher = less
              sensitive (may miss detections)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Capture Interval: {captureInterval} seconds
            </label>
            <input
              type="range"
              min="10"
              max="120"
              step="10"
              value={captureInterval}
              onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-2">
              How often the camera captures images (lower = more frequent)
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Motion Detection</p>
              <p className="text-sm text-slate-400">
                Capture only when motion is detected
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Security</h2>
            <p className="text-sm text-slate-400">
              Manage your security settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-red-400 hover:bg-red-500/10"
          >
            <Mail className="h-4 w-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} isLoading={saving}>
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
