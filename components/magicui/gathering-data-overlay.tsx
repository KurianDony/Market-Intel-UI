"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** Eye viewport — 3× prior 1500px build; no box. */
const EYE_VIEWPORT_PX = 1500 * 3;
const LOTTIE_INSET_X = 80 * 3;
const LOTTIE_INSET_Y = 120 * 3;
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
  const lottieMaxW = `min(${EYE_VIEWPORT_PX - LOTTIE_INSET_X}px, calc(100vw - ${VIEWPORT_MARGIN_PX * 2 + LOTTIE_INSET_X}px))`;

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

          <div className="relative z-20 mx-auto flex flex-col items-center justify-center px-4 text-center">
            <div
              className="mx-auto flex items-center justify-center"
              style={{
                width: lottieMaxW,
                maxWidth: "100%",
                height: `min(${EYE_VIEWPORT_PX - LOTTIE_INSET_Y}px, calc(100dvh - ${VIEWPORT_MARGIN_PX * 2 + LOTTIE_INSET_Y + 20}px))`,
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
                fontSize: "clamp(56px, 6.4vw, 72px)",
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
