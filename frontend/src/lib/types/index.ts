import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: "admin" | "viewer";
}

export interface Alert {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  timestamp: Timestamp | Date;
  status: "known" | "unknown" | "resolved";
  personId?: string | null;
  personName?: string | null;
  confidence?: number;
  cameraId: string;
  cameraName: string;
  resolved: boolean;
  resolvedAt?: Timestamp | Date | null;
  resolvedBy?: string | null;
}

export interface Person {
  id: string;
  name: string;
  relation: string;
  embedding: number[];
  trainingImages: string[];
  createdAt: Timestamp | Date;
  lastSeen?: Timestamp | Date | null;
  detectionCount: number;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  ipAddress: string;
  status: "online" | "offline";
  lastSeen: Timestamp | Date;
  settings: {
    detectionEnabled: boolean;
    motionSensitivity: number;
    schedule?: { start: string; end: string };
  };
  createdAt: Timestamp | Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: "alert" | "system" | "info";
  title: string;
  message: string;
  read: boolean;
  timestamp: Timestamp | Date;
  relatedId?: string | null;
}

export interface AlertFilters {
  status?: "known" | "unknown" | "resolved" | "all";
  cameraId?: string;
  personId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
