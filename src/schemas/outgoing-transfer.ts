import { z } from "zod";

/**
 * Schema for a row from `/transfers/v2/outgoing` (and reused for
 * `/transfers/v2/rejected` since the discovery license had 0 rejected
 * transfers to observe a separate shape).
 *
 * Differs from `metrcTransferSchema` (which models the incoming
 * endpoint) — outgoing adds InvoiceNumber, IsVoided,
 * VehicleRegistrationNumber, ContainsPreTreatedProductPackage, Name,
 * OriginatingTemplateId and has nullable Recipient/ShipmentType fields
 * (incoming has them non-null).
 *
 * `.passthrough()` preserves any rejected-only fields (RejectorFacility*,
 * RejectionDate, RejectionReason) that the discovery audit could not
 * verify.
 */
export const metrcOutgoingTransferSchema = z.object({
  Id: z.number(),
  ManifestNumber: z.string(),
  ShipmentLicenseType: z.string(),
  ShipperFacilityLicenseNumber: z.string(),
  ShipperFacilityName: z.string(),
  RecipientFacilityLicenseNumber: z.string().nullable(),
  RecipientFacilityName: z.string().nullable(),
  TransporterFacilityLicenseNumber: z.string().nullable(),
  TransporterFacilityName: z.string().nullable(),
  DriverName: z.string().nullable(),
  DriverOccupationalLicenseNumber: z.string().nullable(),
  DriverVehicleLicenseNumber: z.string().nullable(),
  VehicleMake: z.string().nullable(),
  VehicleModel: z.string().nullable(),
  VehicleLicensePlateNumber: z.string().nullable(),
  VehicleRegistrationNumber: z.string().nullable(),
  DeliveryId: z.number(),
  DeliveryCount: z.number(),
  ReceivedDeliveryCount: z.number(),
  PackageCount: z.number(),
  ReceivedPackageCount: z.number(),
  DeliveryPackageCount: z.number(),
  DeliveryReceivedPackageCount: z.number(),
  InvoiceNumber: z.string().nullable(),
  IsVoided: z.boolean(),
  Name: z.string().nullable(),
  OriginatingTemplateId: z.number().nullable(),
  ShipmentTypeName: z.string().nullable(),
  ShipmentTransactionType: z.string().nullable(),
  ContainsPlantPackage: z.boolean(),
  ContainsProductPackage: z.boolean(),
  ContainsTradeSample: z.boolean(),
  ContainsDonation: z.boolean(),
  ContainsTestingSample: z.boolean(),
  ContainsProductRequiresRemediation: z.boolean(),
  ContainsRemediatedProductPackage: z.boolean(),
  ContainsPreTreatedProductPackage: z.boolean(),
  CreatedDateTime: z.string(),
  CreatedByUserName: z.string().nullable(),
  LastModified: z.string(),
  EstimatedDepartureDateTime: z.string(),
  ActualDepartureDateTime: z.string().nullable(),
  EstimatedArrivalDateTime: z.string(),
  ActualArrivalDateTime: z.string().nullable(),
  ReceivedDateTime: z.string().nullable(),
  EstimatedReturnDepartureDateTime: z.string().nullable(),
  ActualReturnDepartureDateTime: z.string().nullable(),
  EstimatedReturnArrivalDateTime: z.string().nullable(),
  ActualReturnArrivalDateTime: z.string().nullable(),
}).passthrough();

export type MetrcOutgoingTransfer = z.infer<typeof metrcOutgoingTransferSchema>;
