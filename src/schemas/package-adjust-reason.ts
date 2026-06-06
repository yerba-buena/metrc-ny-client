import { z } from "zod";

/**
 * Schema for a row from `/packages/v2/adjust/reasons`.
 *
 * A small lookup catalog of valid reasons a package may be adjusted
 * (count adjustment, waste reporting, etc.). Categories are joined to
 * adjust operations via Name; there is no Id field.
 */
export const metrcPackageAdjustReasonSchema = z.object({
  Name: z.string(),
  RequiresNote: z.boolean(),
  RequiresWasteWeight: z.boolean(),
  RequiresImmatureWasteWeight: z.boolean(),
  RequiresMatureWasteWeight: z.boolean(),
});

export type MetrcPackageAdjustReason = z.infer<typeof metrcPackageAdjustReasonSchema>;
