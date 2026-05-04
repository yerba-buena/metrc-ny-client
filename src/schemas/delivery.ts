import { z } from "zod";
import { metrcTransferSchema } from "./transfer.js";
import { metrcPackageSchema } from "./package.js";

export const metrcDeliverySchema = z.object({
  Id: z.number(),
  RecipientFacilityLicenseNumber: z.string(),
  RecipientFacilityName: z.string(),
  ShipmentTypeName: z.string(),
  ShipmentTransactionType: z.string(),
  EstimatedDepartureDateTime: z.string(),
  ActualDepartureDateTime: z.string().nullable(),
  EstimatedArrivalDateTime: z.string(),
  ActualArrivalDateTime: z.string().nullable(),
  DeliveryPackageCount: z.number(),
  DeliveryReceivedPackageCount: z.number(),
  ReceivedDateTime: z.string().nullable(),
  EstimatedReturnDepartureDateTime: z.string().nullable(),
  ActualReturnDepartureDateTime: z.string().nullable(),
  EstimatedReturnArrivalDateTime: z.string().nullable(),
  ActualReturnArrivalDateTime: z.string().nullable(),
});

export type MetrcDelivery = z.infer<typeof metrcDeliverySchema>;

export const deliveryWithPackagesSchema = z.object({
  transfer: metrcTransferSchema,
  packages: z.array(metrcPackageSchema),
});

export type DeliveryWithPackages = z.infer<typeof deliveryWithPackagesSchema>;
