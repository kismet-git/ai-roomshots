const STORAGE_KEY = "ai-roomshots-fp";

export function ensureFingerprint(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const uuid = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, uuid);
  return uuid;
}

export function getFingerprint(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}
