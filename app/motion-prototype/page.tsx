import type { Metadata } from "next";
import { MotionPrototype } from "@/components/motion/MotionPrototype";

export const metadata: Metadata = {
  title: "Motion Prototype — Market Intel",
  robots: { index: false, follow: false },
};

export default function MotionPrototypePage() {
  return <MotionPrototype />;
}
