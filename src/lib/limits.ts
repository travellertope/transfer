export const FREE_LIMIT_BYTES = 800 * 1024 * 1024;
export const PRO_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;
export const FREE_MONTHLY_TRANSFER_LIMIT = 3;
// YouTube's API quota (uploads/day) is shared across the whole app, not
// per user — capping each user keeps one account from being able to burn
// through the entire shared daily quota alone.
export const YOUTUBE_DAILY_UPLOAD_LIMIT = 2;

export function limitForUser(isPro: boolean) {
  return isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " bytes";
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 5) return "a few seconds";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export function estimateSecondsRemaining(bytesTransferred: number, totalBytes: number | null, bytesPerSecond: number | null): number | null {
  if (!bytesPerSecond || bytesPerSecond <= 0 || !totalBytes) return null;
  const remaining = totalBytes - bytesTransferred;
  if (remaining <= 0) return 0;
  return remaining / bytesPerSecond;
}
