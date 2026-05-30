"use client";

import { areaDashboardHref, suburbDashboardHref } from "@/lib/dash/slugs";
import { INK_0, INK_100 } from "@/lib/palette/v2";
import { useGatheringDataNavigation } from "@/components/magicui/gathering-data-provider";

type AreaRef = { name: string; slug: string };
type SuburbRef = {
  name: string;
  slug: string;
  postcode: string;
  area: string;
  state: string;
};

export function SeeDataLink({
  level,
  stateKey,
  area,
  suburb,
}: {
  level: "area" | "suburb";
  stateKey: string;
  area: AreaRef | null;
  suburb: SuburbRef | null;
}) {
  const { navigateWithGathering } = useGatheringDataNavigation();

  if (!area) return null;

  const href =
    level === "suburb" && suburb
      ? suburbDashboardHref(suburb.state, area.slug, suburb.slug)
      : areaDashboardHref(stateKey, area.slug);

  const label = level === "suburb" && suburb ? suburb.name : area.name;

  return (
    <button
      type="button"
      onClick={() => navigateWithGathering(href)}
      className="pointer-events-auto absolute bottom-24 right-6 z-[1100] border border-solid px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:bg-[#1a1a1a]"
      style={{ background: INK_0, borderColor: INK_100, color: INK_100 }}
    >
      See data for {label} →
    </button>
  );
}
