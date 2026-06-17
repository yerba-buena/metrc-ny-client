import { z } from "zod";

/**
 * A sales payment type entry.
 * Returned by `/sales/v2/paymenttypes`.
 *
 * NOTE: This endpoint returns HTTP 401 on the current license; the full
 * field shape is unverified. Schema is permissive (Name required +
 * passthrough) to avoid breaking when this endpoint becomes accessible.
 */
export const metrcSalesPaymentTypeSchema = z.object({
  Name: z.string(),
}).passthrough();

export type MetrcSalesPaymentType = z.infer<typeof metrcSalesPaymentTypeSchema>;
