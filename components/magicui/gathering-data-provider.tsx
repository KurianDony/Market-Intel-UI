"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { GatheringDataOverlay } from "@/components/magicui/gathering-data-overlay";

const MIN_VISIBLE_MS = 2000;

type GatheringDataContextValue = {
  navigateWithGathering: (href: string) => void;
  isGathering: boolean;
};

const GatheringDataContext = createContext<GatheringDataContextValue | null>(
  null,
);

export function GatheringDataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateWithGathering = useCallback(
    (href: string) => {
      if (pendingHrefRef.current) return;
      pendingHrefRef.current = href;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      setVisible(true);
      void router.prefetch(href);
      router.push(href);

      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        pendingHrefRef.current = null;
        hideTimerRef.current = null;
      }, MIN_VISIBLE_MS);
    },
    [router],
  );

  return (
    <GatheringDataContext.Provider
      value={{ navigateWithGathering, isGathering: visible }}
    >
      {children}
      <GatheringDataOverlay visible={visible} />
    </GatheringDataContext.Provider>
  );
}

export function useGatheringDataNavigation(): GatheringDataContextValue {
  const ctx = useContext(GatheringDataContext);
  if (!ctx) {
    throw new Error(
      "useGatheringDataNavigation must be used within GatheringDataProvider",
    );
  }
  return ctx;
}
