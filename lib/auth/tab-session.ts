export const TAB_SESSION_KEY = "mm_session_alive";

export function markTabSessionAlive(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TAB_SESSION_KEY, "1");
}

export function isTabSessionAlive(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TAB_SESSION_KEY) === "1";
}

export function clearTabSessionMarker(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TAB_SESSION_KEY);
}
