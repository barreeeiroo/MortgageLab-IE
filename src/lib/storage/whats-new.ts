import { STORAGE_KEYS } from "./forms";

export function getStoredVersion(): number | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEYS.WHATS_NEW_VERSION);
    return stored ? Number.parseInt(stored, 10) : null;
}

export function setStoredVersion(version: number): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.WHATS_NEW_VERSION, String(version));
}
