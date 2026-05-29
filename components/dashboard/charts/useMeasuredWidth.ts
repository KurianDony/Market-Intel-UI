"use client";

import { useLayoutEffect, useRef, useState } from "react";

function readWidth(el: HTMLElement, entry?: ResizeObserverEntry): number {
  const raw =
    entry?.contentRect.width ??
    entry?.borderBoxSize?.[0]?.inlineSize ??
    el.getBoundingClientRect().width;
  const w = typeof raw === "number" ? raw : 0;
  return w > 0 ? Math.floor(w) : 0;
}

/**
 * Reactive container width for Recharts — ResizeObserver fires on every layout
 * change, including the initial 0 → measured width transition after mount.
 */
export function useMeasuredWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = (entry?: ResizeObserverEntry) => {
      setWidth(readWidth(el, entry));
    };

    apply();

    const observer = new ResizeObserver((entries) => {
      apply(entries[0]);
    });
    observer.observe(el, { box: "border-box" });

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
