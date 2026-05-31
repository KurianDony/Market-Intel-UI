"use client";

import { useEffect, useState } from "react";

const DISMISS_MS = 10_000;
const STORAGE_KEY = "market-meerkat-auth-chrome-dismissed";

export function SessionAuthChrome({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }, DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[10000]">
      <div className="pointer-events-auto rounded-md border border-border/60 bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
