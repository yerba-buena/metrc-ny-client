import { z } from "zod";

export const metrcLocationSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  LocationTypeId: z.number().nullable(),
  LocationTypeName: z.string().nullable(),
  ForPlantBatches: z.boolean(),
  ForPlants: z.boolean(),
  ForHarvests: z.boolean(),
  ForPackages: z.boolean(),
});

export type MetrcLocation = z.infer<typeof metrcLocationSchema>;
