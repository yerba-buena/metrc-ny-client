import { z } from "zod";

/**
 * Nested Item object within an active package response.
 *
 * Modeled with the fields useful for inventory identification.
 * `.passthrough()` preserves extra fields (cannabinoid content, images, etc.)
 * that the API returns but we don't need to validate.
 */
export const metrcActivePackageItemSchema = z.object({
  Id: z.number(),
  Name: z.string(),
  GlobalProductName: z.string().nullable(),
  GlobalProductNumber: z.string().nullable(),
  ProductCategoryName: z.string(),
  ProductCategoryType: z.number(),
  QuantityType: z.number(),
  DefaultLabTestingState: z.number(),
  UnitOfMeasureName: z.string().nullable(),
  ApprovalStatus: z.number(),
  ApprovalStatusDateTime: z.string(),
  StrainId: z.number().nullable(),
  StrainName: z.string().nullable(),
  ItemBrandId: z.number(),
  ItemBrandName: z.string().nullable(),
  AdministrationMethod: z.string().nullable(),
  Description: z.string().nullable(),
  IsUsed: z.boolean(),
}).passthrough();

/**
 * Nested ProductLabel object within an active package response.
 */
export const metrcActivePackageProductLabelSchema = z.object({
  QrCount: z.number(),
  IsChildFromParentWithLabel: z.boolean(),
  OriginalSourcePackageId: z.number().nullable(),
  OriginalSourcePackageLabel: z.string().nullable(),
  LabelSource: z.string().nullable(),
  IsActive: z.boolean(),
}).passthrough();

/**
 * Schema for an active inventory package from `/packages/v2/active`.
 *
 * Distinct from `metrcPackageSchema` (which represents a shipment/delivery package
 * with fields like `ShippedQuantity` and `ShipmentPackageState`). Active packages
 * are on-hand inventory with `Quantity`, `LocationName`, etc.
 */
export const metrcActivePackageSchema = z.object({
  Id: z.number(),
  Label: z.string(),
  ExternalId: z.string().nullable(),
  PackageType: z.string(),
  SourceHarvestCount: z.number(),
  SourcePackageCount: z.number(),
  SourceProcessingJobCount: z.number(),
  SourceHarvestNames: z.string().nullable(),
  SourcePackageLabels: z.string().nullable(),
  LocationId: z.number().nullable(),
  LocationName: z.string().nullable(),
  SublocationId: z.number().nullable(),
  SublocationName: z.string().nullable(),
  LocationTypeName: z.string().nullable(),
  Quantity: z.number(),
  OriginalPackageQuantity: z.number(),
  UnitOfMeasureName: z.string(),
  UnitOfMeasureAbbreviation: z.string(),
  PatientLicenseNumber: z.string().nullable(),
  ItemFromFacilityLicenseNumber: z.string().nullable(),
  ItemFromFacilityName: z.string().nullable(),
  Note: z.string().nullable(),
  PackagedDate: z.string().nullable(),
  ExpirationDate: z.string().nullable(),
  SellByDate: z.string().nullable(),
  UseByDate: z.string().nullable(),
  InitialLabTestingState: z.string(),
  LabTestingState: z.string(),
  LabTestingStateDate: z.string(),
  LabTestingPerformedDate: z.string().nullable(),
  LabTestResultExpirationDateTime: z.string().nullable(),
  LabTestingRecordedDate: z.string().nullable(),
  LabTestStageId: z.number().nullable(),
  LabTestStage: z.string().nullable(),
  IsProductionBatch: z.boolean(),
  ProductionBatchNumber: z.string().nullable(),
  SourceProductionBatchNumbers: z.string().nullable(),
  IsTradeSample: z.boolean(),
  IsTradeSamplePersistent: z.boolean(),
  SourcePackageIsTradeSample: z.boolean(),
  IsDonation: z.boolean(),
  IsDonationPersistent: z.boolean(),
  SourcePackageIsDonation: z.boolean(),
  IsTestingSample: z.boolean(),
  IsProcessValidationTestingSample: z.boolean(),
  ProductRequiresRemediation: z.boolean(),
  ContainsRemediatedProduct: z.boolean(),
  RemediationDate: z.string().nullable(),
  ProductRequiresDecontamination: z.boolean(),
  ContainsDecontaminatedProduct: z.boolean(),
  DecontaminationDate: z.string().nullable(),
  ContainsPreTreatedProduct: z.boolean(),
  PreTreatmentDate: z.string().nullable(),
  ReceivedDateTime: z.string().nullable(),
  ReceivedFromManifestNumber: z.string().nullable(),
  ReceivedFromFacilityLicenseNumber: z.string().nullable(),
  ReceivedFromFacilityName: z.string().nullable(),
  IsOnHold: z.boolean(),
  IsOnHoldCombined: z.boolean(),
  IsOnInvestigation: z.boolean(),
  IsOnInvestigationHold: z.boolean(),
  IsOnInvestigationRecall: z.boolean(),
  IsOnRecall: z.boolean().nullable(),
  IsOnRecallCombined: z.boolean(),
  ArchivedDate: z.string().nullable(),
  IsFinished: z.boolean(),
  FinishedDate: z.string().nullable(),
  IsFinishedGood: z.boolean(),
  IsOnRetailerDelivery: z.boolean(),
  PackageForProductDestruction: z.unknown().nullable(),
  LabelsLastGeneratedDateTime: z.string().nullable(),
  LastModified: z.string(),
  Item: metrcActivePackageItemSchema,
  ProductLabel: metrcActivePackageProductLabelSchema,
});

export type MetrcActivePackage = z.infer<typeof metrcActivePackageSchema>;
