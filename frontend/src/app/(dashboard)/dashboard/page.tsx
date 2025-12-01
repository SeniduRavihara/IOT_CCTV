"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { formatDistanceToNow } from "date-fns";
import { collection, getDocs, limit, onSnapshot, orderBy, query, writeBatch } from "firebase/firestore";
import { AlertTriangle, Camera, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats state (could be real too, but let's fix alerts first)
  const stats = [
    {
      name: "Total Alerts Today",
      value: "12",
      icon: AlertTriangle,
      color: "text-red-400",
      change: "+2 from yesterday",
    },
    {
      name: "Unknown Persons",
      value: "3",
      icon: AlertTriangle,
      color: "text-yellow-400",
      change: "Requires attention",
    },
    {
      name: "Active Cameras",
      value: "4",
      icon: Camera,
      color: "text-green-400",
      change: "All online",
    },
    {
      name: "Known Persons",
      value: "8",
      icon: Users,
      color: "text-blue-400",
      change: "Registered",
    },
  ];

  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentAlerts(alertsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClearAlerts = async () => {
    if (!confirm("Are you sure you want to delete ALL alerts? This cannot be undone.")) return;
    
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Welcome back! Here&apos;s your security overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-100 mt-2">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg bg-gray-700 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Alerts</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearAlerts}
            disabled={recentAlerts.length === 0}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Alerts
          </Button>
        </CardHeader>
        <CardContent>
          {/* ... */}
          <div className="space-y-4">
            {recentAlerts.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No recent alerts</p>
            ) : (
                recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-gray-600 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-100">
                            {alert.details?.name || "Unknown Person"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {alert.cameraName || "Camera"} • {alert.timestamp ? formatDistanceToNow(alert.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={alert.details?.name && alert.details.name !== "Unknown" ? "success" : "danger"}
                    >
                      {alert.details?.name && alert.details.name !== "Unknown" ? "Known" : "Unknown"}
                    </Badge>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>


      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Firebase Connection</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">AI Model</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Camera Network</span>
                <Badge variant="success">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Email Service</span>
                <Badge variant="success">Operational</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">
                Add Person
              </button>
              <button 
                onClick={handleClearAlerts}
                className="p-4 bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 rounded-lg text-red-400 font-medium transition-colors flex flex-col items-center justify-center gap-2"
              >
                <Trash2 className="h-5 w-5" />
                Clear Alerts
              </button>
              <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors">
                Add Camera
              </button>
              <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors">
                Export Data
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
