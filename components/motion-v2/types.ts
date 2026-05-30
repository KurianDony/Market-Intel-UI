export type Area = { name: string; slug: string };

export type Suburb = {
  name: string;
  slug: string;
  postcode: string;
  area: string;
  state: string;
};

/** NSW hand-drawn areas excluded from the state-level tile map. */
export const EXCLUDED_NSW_AREAS = new Set([
  "Newcastle",
  "Wollongong",
  "North North",
  "Queensland",
  "Tasmania",
]);

export interface LeafletSceneHandle {
  goToNswState: () => void;
  drillToArea: (area: Area) => void;
  focusSuburb: (suburb: Suburb) => void;
  upToArea: (area: Area) => void;
  showSingleStateSuburb: (suburb: Suburb) => void;
  getAreaCounts: () => Record<string, number>;
}
