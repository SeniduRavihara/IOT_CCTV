export const ALERT_STATUS = {
  KNOWN: "known",
  UNKNOWN: "unknown",
  RESOLVED: "resolved",
} as const;

export const DATE_FORMATS = {
  FULL: "PPpp",
  SHORT: "PP",
  TIME: "p",
  RELATIVE: "relative",
} as const;

export const PAGINATION_LIMITS = {
  ALERTS: 50,
  PERSONS: 20,
  CAMERAS: 10,
} as const;

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const DETECTION_THRESHOLD = 0.6; // Face recognition threshold
