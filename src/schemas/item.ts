import { z } from "zod";

/**
 * Schema for an item (SKU) from `/items/v2/active`.
 *
 * METRC items are the canonical product catalog — distinct from packages
 * (which are physical instances of an item). One item corresponds to a SKU
 * that can be referenced by many packages and sales transactions.
 *
 * `.passthrough()` preserves the many optional fields METRC adds per
 * product category (cannabinoid content, images, packaging metadata, etc.)
 * that we don't currently use but don't want to discard.
 */
export const metrcItemSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  ProductCategoryName: z.string(),
  ProductCategoryType: z.string(),
  QuantityType: z.string(),
  UnitOfMeasureName: z.string().nullable(),
  StrainId: z.number().nullable(),
  StrainName: z.string().nullable(),
  ItemBrandId: z.number(),
  ItemBrandName: z.string().nullable(),
  ApprovalStatus: z.string(),
  ApprovalStatusDateTime: z.string(),
  IsUsed: z.boolean(),
}).passthrough();

export type MetrcItem = z.infer<typeof metrcItemSchema>;
