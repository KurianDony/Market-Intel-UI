import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthButton } from "@/components/auth-button";
import { GatheringDataProvider } from "@/components/magicui/gathering-data-provider";
import { hasEnvVars } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Market Meerkat — Dashboard",
  description: "Rental market intelligence — area and suburb dashboards",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${jetbrains.variable} font-sans`}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <GatheringDataProvider>
        {hasEnvVars ? (
          <div className="pointer-events-none fixed right-3 top-3 z-[10000]">
            <div className="pointer-events-auto rounded-md border border-border/60 bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur-sm">
              <Suspense>
                <AuthButton />
              </Suspense>
            </div>
          </div>
        ) : null}
        {children}
      </GatheringDataProvider>
    </div>
  );
}
