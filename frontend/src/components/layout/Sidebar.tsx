"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils/cn";
import {
  Bell,
  Camera,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Known Persons", href: "/dashboard/known-persons", icon: Users },
  { name: "Cameras", href: "/dashboard/cameras", icon: Camera },
  { name: "Live Feed", href: "/dashboard/live", icon: Camera },
  { name: "History", href: "/dashboard/history", icon: History },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-800 border-r border-gray-700">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-700 px-6">
        <div className="p-2 bg-blue-600 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <span className="text-lg font-semibold text-gray-100">SecureHome</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-100 truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-700/50 hover:text-gray-100 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
