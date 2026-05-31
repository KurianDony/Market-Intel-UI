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
const BASE_WIDTH_PX = 96;
const BASE_HEIGHT_PX = Math.round(BASE_WIDTH_PX * (600 / 400));

type Edge = "bottom" | "left" | "right";
type Phase = "hidden" | "entering" | "playing" | "exiting";

type Spot = { edge: Edge; pct: number };

type PeekVariant = {
  emergeFraction: number;
  scale: number;
};

/** Full (base) → top-half (+20% vs cycle 1) → top-quarter (+50% vs cycle 1). */
const CYCLE_1_SCALE = 1.8;
const CYCLE_2_SCALE = CYCLE_1_SCALE * 1.2;
const CYCLE_3_SCALE = CYCLE_1_SCALE * 1.5;
const PEEK_VARIANTS: PeekVariant[] = [
  { emergeFraction: 1, scale: CYCLE_1_SCALE },
  { emergeFraction: 0.5, scale: CYCLE_2_SCALE },
  { emergeFraction: 0.25, scale: CYCLE_3_SCALE },
];

function randomSpot(): Spot {
  const edges: Edge[] = ["bottom", "left", "right"];
  const edge = edges[Math.floor(Math.random() * edges.length)]!;
  return { edge, pct: 12 + Math.random() * 76 };
}

function isVisible(phase: Phase): boolean {
  return phase === "entering" || phase === "playing" || phase === "exiting";
}

type PeekBodyProps = {
  variant: PeekVariant;
  phase: Phase;
  lottieRef: React.RefObject<LottieRefCurrentProps | null>;
};

function BottomPeek({ variant, phase, lottieRef }: PeekBodyProps) {
  const width = BASE_WIDTH_PX * variant.scale;
  const height = BASE_HEIGHT_PX * variant.scale;
  const visible = isVisible(phase);
  const offset = visible
    ? `${(1 - variant.emergeFraction) * 100}%`
    : "100%";

  return (
    <div
      className="overflow-hidden"
      style={{ width, height: height * variant.emergeFraction }}
    >
      <div
        className="transition-transform duration-[400ms] ease-out"
        style={{
          width,
          height,
          transform: `translateY(${offset})`,
          filter: "grayscale(1)",
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={meerkatAnimation}
          loop={false}
          autoplay={false}
          className="block h-full w-full"
        />
      </div>
    </div>
  );
}

function LeftPeek({ variant, phase, lottieRef }: PeekBodyProps) {
  const width = BASE_WIDTH_PX * variant.scale;
  const height = BASE_HEIGHT_PX * variant.scale;
  const visible = isVisible(phase);

  return (
    <div
      className="flex justify-end overflow-hidden"
      style={{ width: height * variant.emergeFraction, height: width }}
    >
      <div
        className="shrink-0 transition-transform duration-[400ms] ease-out"
        style={{
          width: height,
          height: width,
          transform: visible ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: height,
            height: width,
            filter: "grayscale(1)",
          }}
        >
          <div
            style={{
              width,
              height,
              transform: "rotate(90deg)",
              transformOrigin: "center center",
            }}
          >
            <Lottie
              lottieRef={lottieRef}
              animationData={meerkatAnimation}
              loop={false}
              autoplay={false}
              className="block h-full w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPeek({ variant, phase, lottieRef }: PeekBodyProps) {
  const width = BASE_WIDTH_PX * variant.scale;
  const height = BASE_HEIGHT_PX * variant.scale;
  const visible = isVisible(phase);

  return (
    <div
      className="flex justify-start overflow-hidden"
      style={{ width: height * variant.emergeFraction, height: width }}
    >
      <div
        className="shrink-0 transition-transform duration-[400ms] ease-out"
        style={{
          width: height,
          height: width,
          transform: visible ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: height,
            height: width,
            filter: "grayscale(1)",
          }}
        >
          <div
            style={{
              width,
              height,
              transform: "rotate(-90deg)",
              transformOrigin: "center center",
            }}
          >
            <Lottie
              lottieRef={lottieRef}
              animationData={meerkatAnimation}
              loop={false}
              autoplay={false}
              className="block h-full w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MeerkatPeek() {
  const [spot, setSpot] = useState<Spot>({ edge: "bottom", pct: 50 });
  const [variant, setVariant] = useState<PeekVariant>(PEEK_VARIANTS[0]!);
  const [phase, setPhase] = useState<Phase>("hidden");
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const timersRef = useRef<number[]>([]);
  const cycleRef = useRef(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const runAppearance = useCallback(() => {
    clearTimers();
    setPhase("hidden");
    setSpot(randomSpot());
    setVariant(PEEK_VARIANTS[cycleRef.current % PEEK_VARIANTS.length]!);
    cycleRef.current += 1;

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

  const anchorClass = cn(
    "pointer-events-none fixed z-[1]",
    spot.edge === "bottom" && "-translate-x-1/2",
    spot.edge !== "bottom" && "-translate-y-1/2",
  );

  const anchorStyle: React.CSSProperties =
    spot.edge === "bottom"
      ? { left: `${spot.pct}%`, bottom: 0 }
      : spot.edge === "left"
        ? { left: 0, top: `${spot.pct}%` }
        : { right: 0, top: `${spot.pct}%` };

  return (
    <div aria-hidden className={anchorClass} style={anchorStyle}>
      {spot.edge === "bottom" ? (
        <BottomPeek variant={variant} phase={phase} lottieRef={lottieRef} />
      ) : spot.edge === "left" ? (
        <LeftPeek variant={variant} phase={phase} lottieRef={lottieRef} />
      ) : (
        <RightPeek variant={variant} phase={phase} lottieRef={lottieRef} />
      )}
    </div>
  );
}
