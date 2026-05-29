/** URL slug helpers — must match aggregator `dash_*_slug` conventions. */

export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** GeoJSON / G2 slug (`strathfield-2135`) → G1 short slug (`strathfield`). */
export function suburbSlugShort(slugPc: string): string {
  return slugPc.replace(/-\d+$/, "");
}

export function stateToSlug(state: string): string {
  return state.toLowerCase();
}

export function stateFromSlug(slug: string): string {
  return slug.toUpperCase();
}

export function areaDashboardHref(state: string, areaNameOrSlug: string): string {
  const stateSlug = stateToSlug(state);
  const areaSlug = areaNameOrSlug.includes(" ")
    ? slugifyName(areaNameOrSlug)
    : areaNameOrSlug;
  return `/${stateSlug}/${areaSlug}`;
}

export function suburbDashboardHref(
  state: string,
  areaNameOrSlug: string,
  suburbSlugPc: string,
): string {
  return `${areaDashboardHref(state, areaNameOrSlug)}/${suburbSlugShort(suburbSlugPc)}`;
}
