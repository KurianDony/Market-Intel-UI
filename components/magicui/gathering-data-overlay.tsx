"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** Large centered eye — viewport units only (no transform scale; that clipped the Lottie). */
const EYE_SIZE = "min(92vw, 72dvh)";
const VIEWPORT_MARGIN_PX = 24;

/** Label vs 56/6.4/72 base. */
const LABEL_SCALE = 0.75 * 0.7 * 0.5;

const WARP_EDGE_MASK =
  "radial-gradient(ellipse 52% 48% at 50% 50%, transparent 0%, transparent 44%, black 80%)";

/** Warp beams — a little faster than prior 1.15× tuning. */
const WARP_SPEED = 1.3;
const WARP_BEAMS_PER_SIDE = 12;
const WARP_BEAM_DURATION = 4.5 / WARP_SPEED;
const WARP_BEAM_DELAY_MIN = 0.4 / WARP_SPEED;
const WARP_BEAM_DELAY_MAX = 3.2 / WARP_SPEED;

export function GatheringDataOverlay({ visible }: { visible: boolean }) {
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
              beamsPerSide={WARP_BEAMS_PER_SIDE}
              beamSize={2}
              beamDuration={WARP_BEAM_DURATION}
              beamDelayMin={WARP_BEAM_DELAY_MIN}
              beamDelayMax={WARP_BEAM_DELAY_MAX}
              gridColor="rgba(255,255,255,0.08)"
              perspective={120}
            />
          </div>

          <div className="relative z-20 flex flex-col items-center justify-center px-4 text-center">
            <div
              className="relative flex shrink-0 items-center justify-center"
              style={{
                width: EYE_SIZE,
                height: EYE_SIZE,
                minWidth: 240,
                minHeight: 240,
                filter: "grayscale(1) brightness(1.05)",
              }}
            >
              <Lottie
                animationData={eyeSeeYouAnimation}
                loop
                autoplay
                className="block h-full w-full"
                aria-hidden
              />
            </div>
            <p
              className="relative z-30 mt-6 shrink-0 whitespace-nowrap text-center font-bold uppercase tracking-[0.22em]"
              style={{
                color: INK_100,
                fontSize: `clamp(${56 * LABEL_SCALE}px, ${6.4 * LABEL_SCALE}vw, ${72 * LABEL_SCALE}px)`,
                transform: "translateY(-14%)",
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
