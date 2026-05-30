import pointOnFeature from "@turf/point-on-feature";
import type { Feature, Geometry } from "geojson";

/** Point inside the polygon — visual label anchor, not bbox center. */
export function featureLabelCenter(
  feature: Feature<Geometry>,
): [lng: number, lat: number] {
  const pt = pointOnFeature(feature);
  const [lng, lat] = pt.geometry.coordinates;
  return [lng, lat];
}
