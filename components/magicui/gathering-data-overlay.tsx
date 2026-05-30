"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** Base eye fills the viewport; visual scale multiplies rendered size (4×). */
const EYE_VISUAL_SCALE = 4;
const EYE_BASE_W = `calc(100vw - ${48}px)`;
const EYE_BASE_H = `calc(100dvh - ${200}px)`;
/** Label vs 56/6.4/72 base. */
const LABEL_SCALE = 0.75 * 0.7 * 0.5;
const VIEWPORT_MARGIN_PX = 24;

const WARP_EDGE_MASK =
  "radial-gradient(ellipse 52% 48% at 50% 50%, transparent 0%, transparent 44%, black 80%)";

/** Warp beam tuning — 15% faster sweep; denser bars via beamsPerSide. */
const WARP_SPEED = 1.15;
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
          className="fixed inset-0 z-[30000] flex items-center justify-center overflow-visible bg-black"
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

          <div className="relative z-20 mx-auto flex flex-col items-center justify-center overflow-visible px-4 text-center">
            <div
              className="mx-auto flex items-center justify-center"
              style={{
                width: EYE_BASE_W,
                height: EYE_BASE_H,
                maxWidth: EYE_BASE_W,
                maxHeight: EYE_BASE_H,
                transform: `scale(${EYE_VISUAL_SCALE})`,
                transformOrigin: "center center",
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
              className="relative z-30 mx-auto mt-8 shrink-0 whitespace-nowrap text-center font-bold uppercase tracking-[0.22em]"
              style={{
                color: INK_100,
                fontSize: `clamp(${56 * LABEL_SCALE}px, ${6.4 * LABEL_SCALE}vw, ${72 * LABEL_SCALE}px)`,
                transform: "translateY(-5%)",
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
