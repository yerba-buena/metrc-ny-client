import { z } from "zod";

/**
 * Schema for a category from `/items/v2/categories`.
 *
 * Categories are the catalog of item *types* defined by the regulator
 * (e.g. "Bud/Flower - Each"). Joined to items via the Name string
 * (item.ProductCategoryName === category.Name) — there is no Id.
 *
 * `.passthrough()` preserves the long tail of lab-test-batch and
 * Requires* fields that METRC adds per category type but that this
 * client does not currently use.
 */
export const metrcItemCategorySchema = z.object({
  Name: z.string(),
  ProductCategoryType: z.string(),
  QuantityType: z.string(),
  CanBeDecontaminated: z.boolean(),
  CanBeDestroyed: z.boolean(),
  CanBePreTreated: z.boolean(),
  CanBeRemediated: z.boolean(),
  CanContainSeeds: z.boolean(),
  RequiresStrain: z.boolean(),
  RequiresItemBrand: z.boolean(),
}).passthrough();

export type MetrcItemCategory = z.infer<typeof metrcItemCategorySchema>;
