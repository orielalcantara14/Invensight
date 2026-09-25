const TAB_STORAGE_KEY = "invensight_active_tabs";

/**
 * Coordinates active browser tabs using localStorage.
 * Ensures that closing one tab while other InvenSight tabs remain open
 * does not inadvertently trigger a full-system disconnect beacon.
 */
export function initTabTracker(onLastTabClose: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const tabId = "tab_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);

  const ping = () => {
    try {
      const raw = localStorage.getItem(TAB_STORAGE_KEY);
      const tabs: Record<string, number> = raw ? JSON.parse(raw) : {};
      const now = Date.now();
      // Purge dead tabs inactive for > 6 seconds
      for (const [id, lastSeen] of Object.entries(tabs)) {
        if (now - lastSeen > 6000) {
          delete tabs[id];
        }
      }
      tabs[tabId] = now;
      localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // Storage unavailable or quota exceeded
    }
  };

  // Initial registration and recurring heartbeat
  ping();
  const interval = setInterval(ping, 2500);

  let hasHandledUnload = false;
  const handleUnload = () => {
    if (hasHandledUnload) return;
    hasHandledUnload = true;

    try {
      const raw = localStorage.getItem(TAB_STORAGE_KEY);
      const tabs: Record<string, number> = raw ? JSON.parse(raw) : {};
      delete tabs[tabId];
      const now = Date.now();
      const remainingAlive = Object.entries(tabs).filter(([_, lastSeen]) => now - lastSeen <= 6000);
      localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs));

      // Only dispatch the disconnect beacon if no other tabs remain alive
      if (remainingAlive.length === 0) {
        onLastTabClose();
      }
    } catch {
      onLastTabClose();
    }
  };

  window.addEventListener("pagehide", handleUnload);
  window.addEventListener("beforeunload", handleUnload);

  return () => {
    clearInterval(interval);
    window.removeEventListener("pagehide", handleUnload);
    window.removeEventListener("beforeunload", handleUnload);
    try {
      const raw = localStorage.getItem(TAB_STORAGE_KEY);
      if (raw) {
        const tabs = JSON.parse(raw);
        delete tabs[tabId];
        localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs));
      }
    } catch {}
  };
}

export function clearTabTracker(): void {
  try {
    localStorage.removeItem(TAB_STORAGE_KEY);
  } catch {}
}
