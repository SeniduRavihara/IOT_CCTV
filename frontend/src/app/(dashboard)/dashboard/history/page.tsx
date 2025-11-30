"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/firebase/config";
import { Alert } from "@/lib/types";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { Activity, Calendar, Download, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function HistoryPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7); // days
  const [stats, setStats] = useState({
    total: 0,
    known: 0,
    unknown: 0,
    today: 0,
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = Timestamp.fromDate(
        startOfDay(subDays(new Date(), dateRange))
      );
      const endDate = Timestamp.fromDate(endOfDay(new Date()));

      const q = query(
        collection(db, "alerts"),
        where("timestamp", ">=", startDate),
        where("timestamp", "<=", endDate)
      );

      const snapshot = await getDocs(q);
      const alertsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Alert[];

      setAlerts(alertsData);

      // Calculate stats
      const known = alertsData.filter((a) => a.status === "known").length;
      const unknown = alertsData.filter((a) => a.status === "unknown").length;
      const today = alertsData.filter((a) => {
        const alertDate = a.timestamp?.toDate();
        const now = new Date();
        return alertDate?.toDateString() === now.toDateString();
      }).length;

      setStats({
        total: alertsData.length,
        known,
        unknown,
        today,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  // Prepare chart data
  const getDailyData = () => {
    const days: Record<string, { known: number; unknown: number }> = {};

    for (let i = dateRange - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "MMM dd");
      days[date] = { known: 0, unknown: 0 };
    }

    alerts.forEach((alert) => {
      const date = format(alert.timestamp?.toDate() || new Date(), "MMM dd");
      if (days[date]) {
        if (alert.status === "known") {
          days[date].known++;
        } else {
          days[date].unknown++;
        }
      }
    });

    return Object.entries(days).map(([date, data]) => ({
      date,
      known: data.known,
      unknown: data.unknown,
      total: data.known + data.unknown,
    }));
  };

  const getHourlyData = () => {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;

    alerts.forEach((alert) => {
      const hour = alert.timestamp?.toDate().getHours();
      if (hour !== undefined) hours[hour]++;
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour.padStart(2, "0")}:00`,
      count,
    }));
  };

  const pieData = [
    { name: "Known", value: stats.known, color: "#22c55e" },
    { name: "Unknown", value: stats.unknown, color: "#ef4444" },
  ];

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
          <h1 className="text-3xl font-bold text-white">History & Analytics</h1>
          <p className="text-slate-400 mt-1">View trends and export data</p>
        </div>
        <Button variant="primary">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        {[7, 14, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setDateRange(days)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRange === days
                ? "bg-blue-600 text-white"
                : "bg-slate-900/50 text-slate-400 hover:text-white"
            }`}
          >
            {days} Days
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Alerts</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Activity className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Known Persons</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.known}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Unknown</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.unknown}
              </p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Today</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.today}
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Daily Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getDailyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="known"
                stroke="#22c55e"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="unknown"
                stroke="#ef4444"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Known vs Unknown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Detection Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Hourly Activity */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">
            Activity by Hour
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getHourlyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
