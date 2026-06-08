import type { MetrcActivePackage } from "../schemas/index.js";

/**
 * Enhancement: composed from nothing (pure function over MetrcActivePackage[]).
 *
 * Groups a list of active/inactive/onhold packages by `LocationName`.
 * Packages with a null LocationName end up under the special key
 * "<no location>" so callers can still see them.
 */
export type LocationGrouping = Record<string, MetrcActivePackage[]>;

export function groupByLocation(packages: MetrcActivePackage[]): LocationGrouping {
  const result: LocationGrouping = {};
  for (const pkg of packages) {
    const key = pkg.LocationName ?? "<no location>";
    const bucket = result[key] ?? [];
    bucket.push(pkg);
    result[key] = bucket;
  }
  return result;
}
