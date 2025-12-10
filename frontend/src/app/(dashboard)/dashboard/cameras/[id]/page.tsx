"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { db } from "@/lib/firebase/config";
import { Camera } from "@/lib/types";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowLeft,
  Save,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CameraDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cameraId = params.id as string;

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(false); // Local online state
  const [imgError, setImgError] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    ipAddress: "",
    detectionEnabled: true,
    motionSensitivity: 50,
    scheduleStart: "00:00",
    scheduleEnd: "23:59",
  });

  useEffect(() => {
    loadCamera();
  }, [cameraId]);

  const loadCamera = async () => {
    try {
      const docRef = doc(db, "cameras", cameraId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const cameraData = { id: docSnap.id, ...docSnap.data() } as Camera;
        setCamera(cameraData);
        // Initialize local online state from DB, but it will update on stream load
        setIsOnline(cameraData.status === "online");

        setFormData({
          name: cameraData.name,
          location: cameraData.location,
          ipAddress: cameraData.ipAddress,
          detectionEnabled: cameraData.settings?.detectionEnabled ?? true,
          motionSensitivity: cameraData.settings?.motionSensitivity ?? 50,
          scheduleStart: cameraData.settings?.schedule?.start ?? "00:00",
          scheduleEnd: cameraData.settings?.schedule?.end ?? "23:59",
        });
      } else {
        alert("Camera not found");
        router.push("/dashboard/cameras");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading camera:", error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "cameras", cameraId), {
        name: formData.name,
        location: formData.location,
        ipAddress: formData.ipAddress,
        settings: {
          detectionEnabled: formData.detectionEnabled,
          motionSensitivity: formData.motionSensitivity,
          schedule: {
            start: formData.scheduleStart,
            end: formData.scheduleEnd,
          },
        },
      });
      alert("Camera settings saved successfully!");
      router.push("/dashboard/cameras");
    } catch (error) {
      console.error("Error saving camera:", error);
      alert("Failed to save camera settings");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!camera) return null;

  const streamUrl = `http://${formData.ipAddress || camera.ipAddress}/stream`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cameras">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">Camera Settings</h1>
          <p className="text-slate-400 mt-1">Configure {camera.name}</p>
        </div>
        <Badge variant={isOnline ? "success" : "danger"}>
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3 mr-1" /> Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" /> Offline
            </>
          )}
        </Badge>
      </div>

      {/* Camera Info Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`p-4 rounded-lg ${
              isOnline ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            <Video
              className={`h-8 w-8 ${
                isOnline ? "text-green-400" : "text-red-400"
              }`}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{camera.name}</h2>
            <p className="text-slate-400">{camera.location}</p>
          </div>
        </div>
      </Card>

      {/* Live Stream */}
      <Card className="p-6 overflow-hidden">
        <h3 className="text-lg font-semibold text-white mb-4">Live Feed</h3>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={streamUrl}
              alt={`Stream from ${camera.name}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                setImgError(true);
                setIsOnline(false);
              }}
              onLoad={() => {
                setImgError(false);
                setIsOnline(true);
              }}
            />
          ) : (
            <div className="text-center">
              <WifiOff className="h-12 w-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">Camera is offline</p>
              <button
                onClick={() => setImgError(false)}
                className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Fallback for load error (handled via CSS class in real app, simplified here) */}
          <div className="hidden stream-error-msg absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-2" />
            <p className="text-slate-400">Stream unavailable</p>
            <p className="text-xs text-slate-600 mt-1">
              Check IP: {camera.ipAddress}
            </p>
          </div>
        </div>
      </Card>

      {/* Basic Settings */}
      <Card className="p-6">
        <div className="space-y-6">
          <Input
            label="Camera Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Front Door Camera"
          />

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="Front Door"
          />

          <Input
            label="IP Address"
            value={formData.ipAddress}
            onChange={(e) => {
              setFormData({ ...formData, ipAddress: e.target.value });
              // Reset error to try loading new IP
              setImgError(false);
            }}
            placeholder="192.168.1.100"
          />
        </div>
      </Card>

      {/* Detection Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          Detection Settings
        </h3>

        <div className="space-y-6">
          {/* Enable Detection */}
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
            <div>
              <p className="font-medium text-white">Enable Detection</p>
              <p className="text-sm text-slate-400">
                Automatically detect and capture motion
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.detectionEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    detectionEnabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Motion Sensitivity */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Motion Sensitivity: {formData.motionSensitivity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.motionSensitivity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  motionSensitivity: parseInt(e.target.value),
                })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-2">
              Higher sensitivity = more detections
            </p>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Active From
              </label>
              <input
                type="time"
                value={formData.scheduleStart}
                onChange={(e) =>
                  setFormData({ ...formData, scheduleStart: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Active Until
              </label>
              <input
                type="time"
                value={formData.scheduleEnd}
                onChange={(e) =>
                  setFormData({ ...formData, scheduleEnd: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Link href="/dashboard/cameras" className="flex-1">
          <Button variant="outline" className="w-full">
            Cancel
          </Button>
        </Link>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleSave}
          isLoading={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
