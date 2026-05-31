"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import meerkatAnimation from "@/public/lottie/meerkat-looking-around.json";
import type { LottieRefCurrentProps } from "lottie-react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const CYCLE_MS = 7500;
const SLIDE_MS = 400;
const PLAY_MS = 2000;
const MEERKAT_WIDTH_PX = 96;

type Edge = "bottom" | "left" | "right";
type Phase = "hidden" | "entering" | "playing" | "exiting";

type Spot = { edge: Edge; pct: number };

function randomSpot(): Spot {
  const edges: Edge[] = ["bottom", "left", "right"];
  const edge = edges[Math.floor(Math.random() * edges.length)]!;
  return { edge, pct: 12 + Math.random() * 76 };
}

function spotStyle(spot: Spot): React.CSSProperties {
  if (spot.edge === "bottom") {
    return { left: `${spot.pct}%`, bottom: 0 };
  }
  if (spot.edge === "left") {
    return { left: 0, top: `${spot.pct}%` };
  }
  return { right: 0, top: `${spot.pct}%` };
}

function slideClass(spot: Spot, phase: Phase): string {
  const visible =
    phase === "entering" || phase === "playing" || phase === "exiting";

  if (spot.edge === "bottom") {
    return visible
      ? "-translate-x-1/2 translate-y-0"
      : "-translate-x-1/2 translate-y-full";
  }
  if (spot.edge === "left") {
    return visible
      ? "-translate-y-1/2 translate-x-0"
      : "-translate-y-1/2 -translate-x-full";
  }
  return visible
    ? "-translate-y-1/2 translate-x-0"
    : "-translate-y-1/2 translate-x-full";
}

export function MeerkatPeek() {
  const [spot, setSpot] = useState<Spot>({ edge: "bottom", pct: 50 });
  const [phase, setPhase] = useState<Phase>("hidden");
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const runAppearance = useCallback(() => {
    clearTimers();
    setPhase("hidden");
    setSpot(randomSpot());

    timersRef.current.push(
      window.setTimeout(() => setPhase("entering"), 50),
      window.setTimeout(() => {
        setPhase("playing");
        lottieRef.current?.goToAndPlay(0, true);
      }, 50 + SLIDE_MS),
      window.setTimeout(() => setPhase("exiting"), 50 + SLIDE_MS + PLAY_MS),
      window.setTimeout(
        () => setPhase("hidden"),
        50 + SLIDE_MS + PLAY_MS + SLIDE_MS,
      ),
    );
  }, [clearTimers]);

  useEffect(() => {
    const start = window.setTimeout(runAppearance, 800);
    const interval = window.setInterval(runAppearance, CYCLE_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
      clearTimers();
    };
  }, [runAppearance, clearTimers]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[1]"
      style={spotStyle(spot)}
    >
      <div
        className={cn(
          "transition-transform duration-[400ms] ease-out",
          slideClass(spot, phase),
        )}
        style={{
          width: MEERKAT_WIDTH_PX,
          filter: "grayscale(1)",
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={meerkatAnimation}
          loop={false}
          autoplay={false}
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}
