"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { Alert } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { Bell, Download, Grid3x3, List, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "unknown" | "known">("all");

  useEffect(() => {
    // ... (existing useEffect code)
    let q = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    if (filter !== "all") {
      q = query(
        collection(db, "alerts"),
        where("status", "==", filter),
        orderBy("timestamp", "desc"),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Alert[];

      setAlerts(alertsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const handleClearAlerts = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL alerts? This cannot be undone."
      )
    )
      return;

    try {
      const q = query(collection(db, "alerts"));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing alerts:", error);
      alert("Failed to clear alerts");
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
          <h1 className="text-3xl font-bold text-white">Security Alerts</h1>
          <p className="text-slate-400 mt-1">
            Monitor and manage detection alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearAlerts}
            disabled={alerts.length === 0}
            className="text-red-400 border-red-900/50 hover:bg-red-900/20 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button variant="primary">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilter("unknown")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "unknown"
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Unknown
          </button>
          <button
            onClick={() => setFilter("known")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "known"
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Known
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${
              viewMode === "grid"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Grid3x3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Alerts Grid/List */}
      {alerts.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-16 w-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No alerts yet
          </h3>
          <p className="text-slate-400">
            Alerts will appear here when the system detects activity
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alerts.map((alert) => (
            <Link key={alert.id} href={`/dashboard/alerts/${alert.id}`}>
              <Card className="hover:border-blue-500 transition-all cursor-pointer overflow-hidden group">
                <div className="relative h-48 bg-slate-800">
                  {alert.imageUrl ? (
                    <Image
                      src={alert.thumbnailUrl || alert.imageUrl}
                      alt="Alert"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Bell className="h-12 w-12 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        alert.status === "unknown"
                          ? "bg-red-500 text-white"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {alert.status === "unknown" ? "Unknown" : "Known"}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {alert.personName || "Unknown Person"}
                    </h3>
                    {alert.confidence && (
                      <span className="text-xs text-slate-400">
                        {Math.round(alert.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">
                    {alert.cameraName || "Camera"} •{" "}
                    {formatDistanceToNow(
                      alert.timestamp instanceof Date
                        ? alert.timestamp
                        : alert.timestamp?.toDate() || new Date(),
                      { addSuffix: true }
                    )}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                    Image
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                    Person
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                    Camera
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-900/50 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/dashboard/alerts/${alert.id}`)
                    }
                  >
                    <td className="px-6 py-4">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-slate-800">
                        {alert.thumbnailUrl || alert.imageUrl ? (
                          <Image
                            src={alert.thumbnailUrl || alert.imageUrl}
                            alt="Alert"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Bell className="h-6 w-6 text-slate-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {alert.personName || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          alert.status === "unknown"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {alert.cameraName || "Camera"}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDistanceToNow(
                        alert.timestamp instanceof Date
                          ? alert.timestamp
                          : alert.timestamp?.toDate() || new Date(),
                        { addSuffix: true }
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {alert.confidence
                        ? `${Math.round(alert.confidence * 100)}%`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
