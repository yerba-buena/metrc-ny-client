import { z } from "zod";

/**
 * Schema for a row from `/locations/v2/types`.
 *
 * This is the LOCATION TYPE itself (the category metadata), distinct
 * from `metrcLocationSchema` which models an actual location instance.
 * Joined to locations via `location.LocationTypeId === type.Id` and
 * `location.LocationTypeName === type.Name`.
 */
export const metrcLocationTypeSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  ForPlantBatches: z.boolean(),
  ForPlants: z.boolean(),
  ForHarvests: z.boolean(),
  ForPackages: z.boolean(),
});

export type MetrcLocationType = z.infer<typeof metrcLocationTypeSchema>;
