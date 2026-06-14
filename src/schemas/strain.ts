import { z } from "zod";

/**
 * Schema for a strain from `/strains/v2/active`, `/strains/v2/inactive`,
 * and `/strains/v2/{id}` — all three endpoints return rows with this
 * shape (confirmed by Phase 5 discovery audit).
 *
 * CbdLevel was observed as null on the strain rows captured; modeled
 * as a nullable number. ThcLevel was non-null number throughout.
 */
export const metrcStrainSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  Genetics: z.string(),
  IndicaPercentage: z.number(),
  SativaPercentage: z.number(),
  CbdLevel: z.number().nullable(),
  ThcLevel: z.number(),
  TestingStatus: z.string(),
  IsUsed: z.boolean(),
});

export type MetrcStrain = z.infer<typeof metrcStrainSchema>;
