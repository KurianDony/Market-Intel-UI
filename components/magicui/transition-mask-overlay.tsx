"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";

const FADE_MS = 120;

export type TransitionMaskApi = {
  /** Show the full-screen warp mask (ref-counted for overlapping flies). */
  begin: () => void;
  /** Hide after map settle / navigation — pairs with begin. */
  end: () => void;
  visible: boolean;
};

/** Ref-counted mask for map drills and See-data navigation. */
export function useTransitionMask(): TransitionMaskApi {
  const depthRef = useRef(0);
  const [visible, setVisible] = useState(false);

  const begin = useCallback(() => {
    depthRef.current += 1;
    setVisible(true);
  }, []);

  const end = useCallback(() => {
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setVisible(false);
  }, []);

  return { begin, end, visible };
}

export function TransitionMaskOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="transition-mask"
          className="fixed inset-0 z-[20000] pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
          aria-hidden
        >
          <div className="absolute inset-0 bg-black" />
          <WarpBackground
            className="absolute inset-0 border-0 p-0"
            beamsPerSide={5}
            beamSize={4}
            beamDuration={1.8}
            gridColor="rgba(255,255,255,0.1)"
            perspective={120}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
