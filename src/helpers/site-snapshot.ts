import type { MetrcClient } from "../client/interface.js";
import type { MetrcActivePackage, MetrcLocation } from "../schemas/index.js";
import { groupByLocation, type LocationGrouping } from "./group-by-location.js";

/**
 * Enhancement: composed from getActiveLocations + getActivePackages +
 * getInactivePackages + getOnHoldPackages.
 *
 * Returns one "what's on site, where" snapshot for the connected
 * facility. The three package categories (active, inactive, onhold)
 * are returned with raw counts plus a combined `packagesByLocation`
 * grouping suitable for inventory-reconciliation views.
 *
 * `locations` is the raw list from /locations/v2/active so callers
 * can also see empty locations (those holding zero packages today).
 */
export interface SiteSnapshot {
  locations: MetrcLocation[];
  packagesByLocation: LocationGrouping;
  counts: {
    active: number;
    inactive: number;
    onHold: number;
  };
}

export async function siteSnapshot(client: MetrcClient): Promise<SiteSnapshot> {
  const [locations, active, inactive, onHold] = await Promise.all([
    client.getActiveLocations(),
    client.getActivePackages(),
    client.getInactivePackages(),
    client.getOnHoldPackages(),
  ]);
  const all = [...active, ...inactive, ...onHold];
  return {
    locations,
    packagesByLocation: groupByLocation(all),
    counts: { active: active.length, inactive: inactive.length, onHold: onHold.length },
  };
}
