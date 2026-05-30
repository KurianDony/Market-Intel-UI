"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_0, INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/** ~2.5× prior eye viewport (was ~420px). */
const EYE_BOX_PX = 1050;

/**
 * Radial mask on the warp layer: beams only visible near the viewport edges;
 * center stays clear so the solid card can sit over the beam convergence point.
 */
const WARP_EDGE_MASK =
  "radial-gradient(ellipse 48% 44% at 50% 50%, transparent 0%, transparent 42%, black 78%)";

export function GatheringDataOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="gathering-data"
          className="fixed inset-0 z-[30000] bg-black"
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
            className="absolute inset-0 z-0"
            style={{
              maskImage: WARP_EDGE_MASK,
              WebkitMaskImage: WARP_EDGE_MASK,
            }}
          >
            <WarpBackground
              className="absolute inset-0 border-0 p-0"
              beamsPerSide={8}
              beamSize={2}
              beamDuration={1.6}
              beamDelayMax={2}
              gridColor="rgba(255,255,255,0.08)"
              perspective={120}
            />
          </div>

          {/* Solid card above beams — covers warp convergence / spawn point */}
          <div className="absolute inset-0 z-20 flex items-center justify-center px-4 py-8">
            <div
              className="flex flex-col items-center justify-center border border-solid text-center"
              style={{
                width: `min(${EYE_BOX_PX}px, 92vw)`,
                maxWidth: "100%",
                background: INK_0,
                borderColor: INK_100,
                padding: "clamp(28px, 4vw, 48px) clamp(24px, 3vw, 40px)",
                boxShadow: "0 0 80px 40px #000",
              }}
            >
              <div
                className="w-full"
                style={{
                  width: `min(${EYE_BOX_PX - 80}px, calc(92vw - 80px))`,
                  maxHeight: "min(72vh, 900px)",
                  filter: "grayscale(1) brightness(1.05)",
                }}
              >
                <Lottie
                  animationData={eyeSeeYouAnimation}
                  loop
                  autoplay
                  className="h-full w-full"
                  aria-hidden
                />
              </div>
              <p
                className="mt-5 w-full font-bold uppercase tracking-[0.22em]"
                style={{
                  color: INK_100,
                  fontSize: "clamp(13px, 1.8vw, 16px)",
                }}
              >
                Gathering your data
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
