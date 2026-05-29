import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

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
      {children}
    </div>
  );
}
