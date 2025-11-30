"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { db } from "@/lib/firebase/config";
import { Camera } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Edit, Plus, Trash2, Video, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCamera, setNewCamera] = useState({
    name: "",
    location: "",
    ipAddress: "",
  });

  useEffect(() => {
    const q = query(collection(db, "cameras"), orderBy("createdAt", "desc"));

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

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "cameras"), {
        ...newCamera,
        status: "offline",
        lastSeen: serverTimestamp(),
        settings: {
          detectionEnabled: true,
          motionSensitivity: 50,
          schedule: { start: "00:00", end: "23:59" },
        },
        createdAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setNewCamera({ name: "", location: "", ipAddress: "" });
    } catch (error) {
      console.error("Error adding camera:", error);
      alert("Failed to add camera");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this camera?")) {
      try {
        await deleteDoc(doc(db, "cameras", id));
      } catch (error) {
        console.error("Error deleting camera:", error);
        alert("Failed to delete camera");
      }
    }
  };

  const toggleDetection = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "cameras", id), {
        "settings.detectionEnabled": !currentStatus,
      });
    } catch (error) {
      console.error("Error updating camera:", error);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cameras</h1>
          <p className="text-slate-400 mt-1">Manage your ESP32-CAM devices</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Camera
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Cameras</p>
              <p className="text-3xl font-bold text-white mt-1">
                {cameras.length}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Video className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Online</p>
              <p className="text-3xl font-bold text-white mt-1">
                {cameras.filter((c) => c.status === "online").length}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Wifi className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Offline</p>
              <p className="text-3xl font-bold text-white mt-1">
                {cameras.filter((c) => c.status === "offline").length}
              </p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <WifiOff className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Cameras Grid */}
      {cameras.length === 0 ? (
        <Card className="p-12 text-center">
          <Video className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No cameras added
          </h3>
          <p className="text-slate-400 mb-6">
            Add your first ESP32-CAM device to get started
          </p>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Camera
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <Card key={camera.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${
                      camera.status === "online"
                        ? "bg-green-500/20"
                        : "bg-red-500/20"
                    }`}
                  >
                    <Video
                      className={`h-6 w-6 ${
                        camera.status === "online"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {camera.name}
                    </h3>
                    <p className="text-sm text-slate-400">{camera.location}</p>
                  </div>
                </div>
                <Badge
                  variant={camera.status === "online" ? "success" : "danger"}
                >
                  {camera.status}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">IP Address</span>
                  <span className="text-white font-mono">
                    {camera.ipAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Detection</span>
                  <button
                    onClick={() =>
                      toggleDetection(
                        camera.id!,
                        camera.settings?.detectionEnabled || false
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      camera.settings?.detectionEnabled
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {camera.settings?.detectionEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Last Seen</span>
                  <span className="text-white">
                    {camera.lastSeen
                      ? formatDistanceToNow(
                          camera.lastSeen instanceof Date
                            ? camera.lastSeen
                            : camera.lastSeen.toDate(),
                          { addSuffix: true }
                        )
                      : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                <Link
                  href={`/dashboard/cameras/${camera.id}`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(camera.id!)}
                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Add New Camera
            </h2>
            <form onSubmit={handleAddCamera} className="space-y-4">
              <Input
                label="Camera Name"
                value={newCamera.name}
                onChange={(e) =>
                  setNewCamera({ ...newCamera, name: e.target.value })
                }
                placeholder="Front Door Camera"
                required
              />
              <Input
                label="Location"
                value={newCamera.location}
                onChange={(e) =>
                  setNewCamera({ ...newCamera, location: e.target.value })
                }
                placeholder="Front Door"
                required
              />
              <Input
                label="IP Address"
                value={newCamera.ipAddress}
                onChange={(e) =>
                  setNewCamera({ ...newCamera, ipAddress: e.target.value })
                }
                placeholder="192.168.1.100"
                required
              />
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  Add Camera
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
