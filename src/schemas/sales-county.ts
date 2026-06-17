import { z } from "zod";

/**
 * A sales county entry.
 * Returned by `/sales/v2/counties`.
 *
 * NOTE: This endpoint returns HTTP 401 on the current license; the full
 * field shape is unverified. Schema is permissive (Name required +
 * passthrough) to avoid breaking when this endpoint becomes accessible.
 */
export const metrcSalesCountySchema = z.object({
  Name: z.string(),
}).passthrough();

export type MetrcSalesCounty = z.infer<typeof metrcSalesCountySchema>;
