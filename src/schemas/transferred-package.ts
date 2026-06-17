import { z } from "zod";

/**
 * Schema for a row from `/packages/v2/transferred`.
 *
 * Each row represents a package received via a manifest transfer.
 * Many fields are nullable (wholesale price, gross weight,
 * processing-job, pre-treatment details) because not every transfer
 * populates them on the receiving side.
 */
export const metrcTransferredPackageSchema = z.object({
  Id: z.number(),
  PackageId: z.number(),
  PackageLabel: z.string(),
  ManifestNumber: z.string(),
  ProductName: z.string(),
  ProductCategoryName: z.string(),
  ItemStrainName: z.string().nullable(),
  SourceHarvestNames: z.string(),
  SourcePackageLabels: z.string(),
  RecipientFacilityLicenseNumber: z.string(),
  RecipientFacilityName: z.string(),
  ReceivedDateTime: z.string(),
  ReceivedQuantity: z.number(),
  ReceivedUnitOfMeasureAbbreviation: z.string(),
  ShippedQuantity: z.number(),
  ShippedUnitOfMeasureAbbreviation: z.string(),
  ShipmentPackageStateName: z.string(),
  LabTestingStateName: z.string(),
  ActualDepartureDateTime: z.string().nullable(),
  ExternalId: z.string().nullable(),
  GrossWeight: z.number().nullable(),
  GrossUnitOfWeightAbbreviation: z.string().nullable(),
  ShipperWholesalePrice: z.number().nullable(),
  ReceiverWholesalePrice: z.number().nullable(),
  ProcessingJobTypeName: z.string().nullable(),
  ContainsPreTreatedProduct: z.boolean(),
  PreTreatmentDate: z.string().nullable(),
});

export type MetrcTransferredPackage = z.infer<typeof metrcTransferredPackageSchema>;
