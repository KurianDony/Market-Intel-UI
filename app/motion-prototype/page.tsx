import type { Metadata } from "next";
import { Suspense } from "react";
import { IntroSplash } from "@/components/motion/IntroSplash";
import { MotionPrototype } from "@/components/motion/MotionPrototype";

export const metadata: Metadata = {
  title: "Motion Prototype — Market Intel",
  robots: { index: false, follow: false },
};

export default function MotionPrototypePage() {
  return (
    <Suspense fallback={null}>
      <IntroSplash />
      <MotionPrototype />
    </Suspense>
  );
}

