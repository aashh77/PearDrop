// Friendly, human-readable device identity helpers.
// LocalDrop never asks for accounts or logins - each browser tab gets a
// random-but-memorable name ("Quiet Falcon") plus an auto-detected device
// type so peers are easy to tell apart in the discovery list.

const ADJECTIVES = [
  "Quiet",
  "Brave",
  "Clever",
  "Swift",
  "Gentle",
  "Bright",
  "Calm",
  "Bold",
  "Sunny",
  "Silent",
  "Lucky",
  "Nimble",
  "Cosmic",
  "Mellow",
  "Vivid",
  "Rapid",
];

const ANIMALS = [
  "Falcon",
  "Otter",
  "Panda",
  "Fox",
  "Wolf",
  "Heron",
  "Tiger",
  "Dolphin",
  "Sparrow",
  "Lynx",
  "Koala",
  "Raven",
  "Badger",
  "Orca",
  "Rabbit",
  "Panther",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateDeviceName() {
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}

/**
 * Best-effort device type detection so we can show a nice icon in the UI.
 * Returns one of "phone" | "tablet" | "laptop".
 */
export function detectDeviceType() {
  if (typeof navigator === "undefined") return "laptop";

  const uaData = navigator.userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") {
    if (uaData.mobile) return "phone";
  }

  const ua = navigator.userAgent || "";
  const isTablet =
    /iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (isTablet) return "tablet";

  const isPhone = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua);
  if (isPhone) return "phone";

  return "laptop";
}

const STORAGE_KEY = "localdrop:device-name";

export function loadOrCreateDeviceName() {
  if (typeof window === "undefined") return generateDeviceName();
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = generateDeviceName();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return generateDeviceName();
  }
}

export function persistDeviceName(name) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // ignore (private browsing / storage disabled)
  }
}
