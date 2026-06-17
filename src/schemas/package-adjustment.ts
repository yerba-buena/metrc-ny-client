import { z } from "zod";

/**
 * Schema for a row from `/packages/v2/adjustments`.
 *
 * This is the actual "package history" endpoint — the conceptual
 * replacement for the deferred `/packages/v2/{id}/history` (METRC NY
 * never exposed that URL; see closed issue #13). Each row is a single
 * adjustment EVENT joined to the affected package via `PackageId`;
 * there is no Id of the adjustment row itself.
 */
export const metrcPackageAdjustmentSchema = z.object({
  PackageId: z.number(),
  PackageLabel: z.string(),
  ItemName: z.string(),
  ItemCategoryName: z.string(),
  PackagedDate: z.string(),
  PackageLabTestResultExpirationDateTime: z.string().nullable(),
  AdjustmentDate: z.string(),
  AdjustmentQuantity: z.number(),
  AdjustmentUnitOfMeasureName: z.string(),
  AdjustmentUnitOfMeasureAbbreviation: z.string(),
  AdjustmentReasonName: z.string(),
  AdjustmentNote: z.string(),
  AdjustedByUserName: z.string(),
});

export type MetrcPackageAdjustment = z.infer<typeof metrcPackageAdjustmentSchema>;
