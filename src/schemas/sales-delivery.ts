import { z } from "zod";

/**
 * A sales delivery entry.
 * Returned by `/sales/v2/deliveries/active`, `/sales/v2/deliveries/inactive`,
 * and `/sales/v2/deliveries/{id}`.
 *
 * NOTE: Distinct from MetrcDelivery in `src/schemas/delivery.ts` which is
 * a transfer delivery. This is a sales delivery resource.
 *
 * 0 rows observed on the current license and some by-id endpoints return
 * HTTP 401. Schema is permissive (Id required + passthrough) to avoid
 * breaking when rows become available or the license is upgraded.
 */
export const metrcSalesDeliverySchema = z.object({
  Id: z.number(),
}).passthrough();

export type MetrcSalesDelivery = z.infer<typeof metrcSalesDeliverySchema>;
