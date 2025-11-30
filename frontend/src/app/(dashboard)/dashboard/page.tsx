"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertTriangle, Camera, Users } from "lucide-react";

export default function DashboardPage() {
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

  const recentAlerts = [
    {
      id: 1,
      person: "Unknown Person",
      time: "2 minutes ago",
      status: "unknown",
      camera: "Front Door",
    },
    {
      id: 2,
      person: "John Doe",
      time: "15 minutes ago",
      status: "known",
      camera: "Backyard",
    },
    {
      id: 3,
      person: "Unknown Person",
      time: "1 hour ago",
      status: "unknown",
      camera: "Garage",
    },
    {
      id: 4,
      person: "Jane Smith",
      time: "2 hours ago",
      status: "known",
      camera: "Front Door",
    },
  ];

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
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gray-600 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-100">{alert.person}</p>
                    <p className="text-sm text-gray-400">
                      {alert.camera} • {alert.time}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={alert.status === "unknown" ? "danger" : "success"}
                >
                  {alert.status === "unknown" ? "Unknown" : "Known"}
                </Badge>
              </div>
            ))}
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
              <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors">
                View Alerts
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
