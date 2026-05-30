"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_0, INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** Card target = 1/10 of original 1500px design (150px). */
const EYE_BOX_SCALE = 1 / 10;
const EYE_BOX_PX = 1500 * EYE_BOX_SCALE;
const BOX_PADDING_X = 36 * EYE_BOX_SCALE;
const BOX_PADDING_TOP = 40 * EYE_BOX_SCALE;
const BOX_PADDING_BOTTOM = 32 * EYE_BOX_SCALE;
const LOTTIE_INSET_X = 80 * EYE_BOX_SCALE;
const LOTTIE_INSET_Y = 120 * EYE_BOX_SCALE;
const VIEWPORT_MARGIN_PX = 24;

/**
 * Radial mask on the warp layer: beams only visible near the viewport edges;
 * center stays clear so the solid card can sit over the beam convergence point.
 */
const WARP_EDGE_MASK =
  "radial-gradient(ellipse 52% 48% at 50% 50%, transparent 0%, transparent 44%, black 80%)";

export function GatheringDataOverlay({ visible }: { visible: boolean }) {
  const boxMaxW = `min(${EYE_BOX_PX}px, calc(100vw - ${VIEWPORT_MARGIN_PX * 2}px))`;
  const boxMaxH = `min(${EYE_BOX_PX}px, calc(100dvh - ${VIEWPORT_MARGIN_PX * 2}px))`;
  const lottieMaxW = `min(${EYE_BOX_PX - LOTTIE_INSET_X}px, calc(100vw - ${VIEWPORT_MARGIN_PX * 2 + LOTTIE_INSET_X}px))`;

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
          {/* Beams — full bleed, masked to outer frame only */}
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

          {/* Solid card — dead center on screen; eye + label centered inside */}
          <div
            className="relative z-20 mx-auto flex flex-col items-center justify-center border border-solid text-center"
            style={{
              width: boxMaxW,
              maxWidth: boxMaxW,
              maxHeight: boxMaxH,
              background: INK_0,
              borderColor: INK_100,
              padding: `${BOX_PADDING_TOP}px ${BOX_PADDING_X}px ${BOX_PADDING_BOTTOM}px`,
              boxShadow: "0 0 40px 20px #000",
            }}
          >
            <div
              className="mx-auto flex w-full items-center justify-center"
              style={{
                width: lottieMaxW,
                maxWidth: "100%",
                height: `min(${EYE_BOX_PX - LOTTIE_INSET_Y}px, calc(100dvh - ${VIEWPORT_MARGIN_PX * 2 + LOTTIE_INSET_Y + 20}px))`,
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
              className="mx-auto mt-3 w-full shrink-0 text-center font-bold uppercase tracking-[0.22em]"
              style={{
                color: INK_100,
                fontSize: "clamp(10px, 1.4vw, 13px)",
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
