import type { Metadata } from "next";
import { Suspense } from "react";
import { IntroSplashV2 } from "@/components/motion-v2/IntroSplashV2";
import { MotionPrototypeV2 } from "@/components/motion-v2/MotionPrototypeV2";

export const metadata: Metadata = {
  title: "Market Meerkat",
  robots: { index: false, follow: false },
};

export default function MotionPrototypePageV2() {
  return (
    <Suspense fallback={null}>
      <IntroSplashV2 />
      <MotionPrototypeV2 />
    </Suspense>
  );
}
