import { z } from "zod";

/**
 * A delivery return reason entry.
 * Returned by `/sales/v2/deliveries/returnreasons` as a paginated list.
 *
 * Shape is structurally identical to metrcPackageAdjustReasonSchema but
 * semantically distinct (sales delivery returns vs package adjustments).
 * Kept separate per Phase 7 audit decision.
 */
export const metrcSalesDeliveryReturnReasonSchema = z.object({
  Name: z.string(),
  RequiresNote: z.boolean(),
  RequiresWasteWeight: z.boolean(),
  RequiresImmatureWasteWeight: z.boolean(),
  RequiresMatureWasteWeight: z.boolean(),
});

export type MetrcSalesDeliveryReturnReason = z.infer<typeof metrcSalesDeliveryReturnReasonSchema>;
