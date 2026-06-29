export const FREE_LIMIT_BYTES = 800 * 1024 * 1024;
export const PRO_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

export function limitForUser(isPro: boolean) {
  return isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " bytes";
}
