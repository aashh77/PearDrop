export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Returns a new File object with a different name, preserving the original
 * bytes/type/lastModified. Used to let a sender rename a file before it is
 * offered to a peer (File.name is read-only, so we can't mutate in place).
 */
// Deterministic, theme-matching gradient pairs used for generated user
// avatars — every stop stays within the pear logo's green -> violet range.
const AVATAR_GRADIENTS = [
  ["#4ade80", "#7c3aed"],
  ["#22c55e", "#8b5cf6"],
  ["#84cc16", "#a855f7"],
  ["#2dd4bf", "#6366f1"],
  ["#a3e635", "#c026d3"],
  ["#34d399", "#7e22ce"],
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function avatarGradient(seed) {
  const idx = hashString(seed || "device") % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function initialsFromName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function renameFile(file, newName) {
  const trimmed = (newName || "").trim();
  if (!trimmed || trimmed === file.name) return file;
  try {
    return new File([file], trimmed, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
