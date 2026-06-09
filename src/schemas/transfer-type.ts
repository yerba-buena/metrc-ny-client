import { z } from "zod";

/**
 * Schema for a row from `/transfers/v2/types`.
 *
 * Lookup catalog of valid transfer types (e.g. "Wholesale Manifest"),
 * each with capability/requirement flags. Note: unlike
 * /packages/v2/types and /sales/v2/customertypes (which return bare
 * arrays of strings), this endpoint is PAGINATED with object rows.
 * Joined to transfers via Name (transfer.ShipmentTypeName === type.Name);
 * there is no Id.
 */
export const metrcTransferTypeSchema = z.object({
  Name: z.string(),
  TransactionType: z.string(),
  BypassApproval: z.boolean(),
  ExternalIncomingCanRecordExternalIdentifier: z.boolean(),
  ExternalIncomingExternalIdentifierRequired: z.boolean(),
  ExternalOutgoingCanRecordExternalIdentifier: z.boolean(),
  ExternalOutgoingExternalIdentifierRequired: z.boolean(),
  ForExternalIncomingShipments: z.boolean(),
  ForExternalOutgoingShipments: z.boolean(),
  ForLicensedShipments: z.boolean(),
  RequiresDestinationGrossWeight: z.boolean(),
  RequiresInvoiceNumber: z.boolean(),
  RequiresPDFDocument: z.boolean(),
  RequiresPackagesGrossWeight: z.boolean(),
  RequiresVehicleRegistrationNumber: z.boolean(),
});

export type MetrcTransferType = z.infer<typeof metrcTransferTypeSchema>;
