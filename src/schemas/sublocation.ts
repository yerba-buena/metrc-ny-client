import { z } from "zod";

/**
 * Schema for a sublocation from `/sublocations/v2/active`,
 * `/sublocations/v2/inactive`, and `/sublocations/v2/{id}`.
 *
 * The Phase 5 discovery license had 0 sublocations so the exact
 * shape could not be observed live. Explicit-type the four fields
 * METRC docs consistently document (Id, Name, LocationId,
 * LocationName) and `.passthrough()` everything else so any
 * sublocation-specific fields don't fail validation. Revisit
 * to tighten the schema once a license with sublocations exists.
 */
export const metrcSublocationSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  LocationId: z.number(),
  LocationName: z.string(),
}).passthrough();

export type MetrcSublocation = z.infer<typeof metrcSublocationSchema>;
