import { z } from "zod";

/**
 * A retailer sales delivery entry.
 * Returned by `/sales/v2/deliveries/retailer/active`,
 * `/sales/v2/deliveries/retailer/inactive`, and
 * `/sales/v2/deliveries/retailer/{id}`.
 *
 * Retailer deliveries may have additional fields compared to standard sales
 * deliveries, so a separate schema is maintained per Phase 7 audit decision.
 *
 * 0 rows observed on the current license and by-id endpoint returns HTTP 401.
 * Schema is permissive (Id required + passthrough) pending live field verification.
 */
export const metrcSalesRetailerDeliverySchema = z.object({
  Id: z.number(),
}).passthrough();

export type MetrcSalesRetailerDelivery = z.infer<typeof metrcSalesRetailerDeliverySchema>;
