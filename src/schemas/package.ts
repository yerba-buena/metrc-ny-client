import { z } from "zod";

export const metrcPackageSchema = z.object({
  PackageId: z.number(),
  PackageLabel: z.string(),
  PackageType: z.string(),
  SourceHarvestNames: z.string().nullable(),
  SourcePackageLabels: z.string().nullable(),
  ItemId: z.number(),
  ItemName: z.string(),
  ItemCategoryName: z.string(),
  ItemStrainName: z.string().nullable(),
  ItemUnitOfMeasureName: z.string(),
  ItemUnitOfMeasureAbbreviation: z.string(),
  LabTestingState: z.string(),
  ProductionBatchNumber: z.string().nullable(),
  IsTradeSample: z.boolean(),
  IsDonation: z.boolean(),
  SourcePackageIsTradeSample: z.boolean(),
  SourcePackageIsDonation: z.boolean(),
  ProductRequiresRemediation: z.boolean(),
  ContainsRemediatedProduct: z.boolean(),
  RemediationDate: z.string().nullable(),
  ShipmentPackageState: z.string(),
  ShippedQuantity: z.number(),
  ShippedUnitOfMeasureName: z.string(),
  ShippedUnitOfMeasureAbbreviation: z.string(),
  GrossUnitOfWeightName: z.string().nullable(),
  GrossUnitOfWeightAbbreviation: z.string().nullable(),
  ReceivedQuantity: z.number().nullable(),
  ReceivedDateTime: z.string().nullable(),
});

export type MetrcPackage = z.infer<typeof metrcPackageSchema>;
