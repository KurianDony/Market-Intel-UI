import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthButton } from "@/components/auth-button";
import { SessionAuthChrome } from "@/components/auth/session-auth-chrome";
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
          <SessionAuthChrome>
            <Suspense>
              <AuthButton />
            </Suspense>
          </SessionAuthChrome>
        ) : null}
        {children}
      </GatheringDataProvider>
    </div>
  );
}
