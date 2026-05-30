"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { WarpBackground } from "@/components/magicui/warp-background";
import { INK_100 } from "@/lib/palette/v2";
import eyeSeeYouAnimation from "@/public/lottie/eye-see-you.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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
          <WarpBackground
            className="absolute inset-0 border-0 p-0"
            beamsPerSide={8}
            beamSize={4}
            beamDuration={1.6}
            beamDelayMax={2}
            gridColor="rgba(255,255,255,0.1)"
            perspective={120}
          >
            <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 py-12">
              <div className="flex max-w-lg flex-col items-center justify-center text-center">
                <div
                  className="w-[min(420px,72vw)] max-h-[min(420px,48vh)]"
                  style={{ filter: "grayscale(1) brightness(1.05)" }}
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
                  className="mt-6 text-sm font-bold uppercase tracking-[0.22em]"
                  style={{ color: INK_100 }}
                >
                  Gathering your data
                </p>
              </div>
            </div>
          </WarpBackground>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
