import { z } from "zod";

/**
 * Schema for an element of the bare-array response from
 * `/packages/v2/{id}/source/harvests`.
 *
 * The Phase 6 discovery audit could not observe a populated row
 * because the test package had no source harvests. Schema is
 * permissive: requires a Name string (every METRC source-reference
 * row includes that), and `.passthrough()` covers any remaining
 * harvest-detail fields (HarvestDate, Quantity, etc.) until a
 * package with source harvests is available for live verification.
 */
export const metrcPackageSourceHarvestSchema = z.object({
  Name: z.string(),
}).passthrough();

export type MetrcPackageSourceHarvest = z.infer<typeof metrcPackageSourceHarvestSchema>;
