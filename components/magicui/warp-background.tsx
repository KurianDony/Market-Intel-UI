"use client";

import React, { HTMLAttributes, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  perspective?: number;
  beamsPerSide?: number;
  beamSize?: number;
  beamDelayMax?: number;
  beamDelayMin?: number;
  beamDuration?: number;
  gridColor?: string;
}

function Beam({
  width,
  x,
  delay,
  duration,
  lightness,
}: {
  width: string | number;
  x: string | number;
  delay: number;
  duration: number;
  lightness: number;
}) {
  const ar = 6 + (lightness % 4);

  return (
    <motion.div
      style={
        {
          position: "absolute",
          top: 0,
          left: x,
          width,
          aspectRatio: `1 / ${ar}`,
          transform: "translateX(-50%)",
          background: `linear-gradient(hsla(0, 0%, ${lightness}%, 0.75), transparent)`,
        } as React.CSSProperties
      }
      initial={{ y: "120%" }}
      animate={{ y: "-120%" }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

export function WarpBackground({
  children,
  perspective = 100,
  className,
  beamsPerSide = 4,
  beamSize = 5,
  beamDelayMax = 2.5,
  beamDelayMin = 0,
  beamDuration = 2.2,
  gridColor = "rgba(255,255,255,0.12)",
  style,
  ...props
}: WarpBackgroundProps) {
  const generateBeams = useCallback(() => {
    const beams: { x: number; delay: number; lightness: number }[] = [];
    const cellsPerSide = Math.floor(100 / beamSize);
    const step = cellsPerSide / beamsPerSide;

    for (let i = 0; i < beamsPerSide; i++) {
      const x = Math.floor(i * step);
      const delay =
        (i / beamsPerSide) * (beamDelayMax - beamDelayMin) + beamDelayMin;
      beams.push({ x, delay, lightness: 55 + (i % 3) * 15 });
    }
    return beams;
  }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin]);

  const topBeams = useMemo(() => generateBeams(), [generateBeams]);
  const rightBeams = useMemo(() => generateBeams(), [generateBeams]);
  const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
  const leftBeams = useMemo(() => generateBeams(), [generateBeams]);

  const gridBg = `linear-gradient(${gridColor} 0 1px, transparent 1px ${beamSize}%), linear-gradient(90deg, ${gridColor} 0 1px, transparent 1px ${beamSize}%)`;

  const sideStyle = (rotate: string): React.CSSProperties => ({
    position: "absolute",
    overflow: "hidden",
    backgroundSize: `${beamSize}% ${beamSize}%`,
    backgroundImage: gridBg,
    transform: rotate,
    transformStyle: "preserve-3d",
  });

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={style}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          perspective: `${perspective}px`,
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            style={{
              ...sideStyle("rotateX(-90deg)"),
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "50% 0%",
            }}
          >
            {topBeams.map((beam, index) => (
              <Beam
                key={`top-${index}`}
                width={`${beamSize}%`}
                x={`${beam.x * beamSize}%`}
                delay={beam.delay}
                duration={beamDuration}
                lightness={beam.lightness}
              />
            ))}
          </div>
          <div
            style={{
              ...sideStyle("rotateX(-90deg)"),
              top: "100%",
              left: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "50% 0%",
            }}
          >
            {bottomBeams.map((beam, index) => (
              <Beam
                key={`bottom-${index}`}
                width={`${beamSize}%`}
                x={`${beam.x * beamSize}%`}
                delay={beam.delay}
                duration={beamDuration}
                lightness={beam.lightness}
              />
            ))}
          </div>
          <div
            style={{
              ...sideStyle("rotate(90deg) rotateX(-90deg)"),
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "0% 0%",
            }}
          >
            {leftBeams.map((beam, index) => (
              <Beam
                key={`left-${index}`}
                width={`${beamSize}%`}
                x={`${beam.x * beamSize}%`}
                delay={beam.delay}
                duration={beamDuration}
                lightness={beam.lightness}
              />
            ))}
          </div>
          <div
            style={{
              ...sideStyle("rotate(-90deg) rotateX(-90deg)"),
              top: 0,
              right: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "100% 0%",
            }}
          >
            {rightBeams.map((beam, index) => (
              <Beam
                key={`right-${index}`}
                width={`${beamSize}%`}
                x={`${beam.x * beamSize}%`}
                delay={beam.delay}
                duration={beamDuration}
                lightness={beam.lightness}
              />
            ))}
          </div>
        </div>
      </div>
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}
