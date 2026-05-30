"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** Eye viewport — same sizing as 1500px centered build (no surrounding box). */
const EYE_VIEWPORT_PX = 1500;
const VIEWPORT_MARGIN_PX = 24;

const WARP_EDGE_MASK =
  "radial-gradient(ellipse 52% 48% at 50% 50%, transparent 0%, transparent 44%, black 80%)";

export function GatheringDataOverlay({ visible }: { visible: boolean }) {
  const lottieMaxW = `min(${EYE_VIEWPORT_PX - 80}px, calc(100vw - ${VIEWPORT_MARGIN_PX * 2 + 80}px))`;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="gathering-data"
          className="fixed inset-0 z-[30000] flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          aria-live="polite"
          aria-busy="true"
          aria-label="Gathering your data"
        >
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              maskImage: WARP_EDGE_MASK,
              WebkitMaskImage: WARP_EDGE_MASK,
            }}
          >
            <WarpBackground
              className="absolute inset-0 border-0 p-0"
              beamsPerSide={8}
              beamSize={2}
              beamDuration={4.5}
              beamDelayMin={0.4}
              beamDelayMax={3.2}
              gridColor="rgba(255,255,255,0.08)"
              perspective={120}
            />
          </div>

          <div className="relative z-20 mx-auto flex flex-col items-center justify-center px-4 text-center">
            <div
              className="mx-auto flex items-center justify-center"
              style={{
                width: lottieMaxW,
                maxWidth: "100%",
                height: `min(${EYE_VIEWPORT_PX - 120}px, calc(100dvh - ${VIEWPORT_MARGIN_PX * 2 + 140}px))`,
                filter: "grayscale(1) brightness(1.05)",
              }}
            >
              <Lottie
                animationData={eyeSeeYouAnimation}
                loop
                autoplay
                className="mx-auto h-full w-full"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
                aria-hidden
              />
            </div>
            <p
              className="mx-auto mt-5 shrink-0 whitespace-nowrap text-center font-bold uppercase tracking-[0.22em]"
              style={{
                color: INK_100,
                fontSize: "clamp(14px, 1.6vw, 18px)",
              }}
            >
              Gathering your data
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
