# @yerba-buena/metrc-ny-client

METRC v2 API client for New York facilities. Live and mock implementations behind a shared interface.

## Scope — not a comprehensive METRC client

This package implements a **small subset** of the METRC API — only the endpoints needed by Yerba Buena's inventory apps. The full METRC NY API has ~25 resource categories and 100+ endpoints ([official docs](https://api-ny.metrc.com/Documentation)). This package currently covers:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/transfers/v2/incoming` | GET | List incoming transfers |
| `/transfers/v2/deliveries/{id}/packages` | GET | List packages for a delivery |
| `/locations/v2/active` | GET | List active locations |
| `/packages/v2/active` | GET | List active inventory packages |

**Not implemented** (non-exhaustive): items, sales, plants, plant batches, harvests, lab tests, strains, employees, tags, processing jobs, patients, caregivers, transporters, sublocations, units of measure, waste methods, and all write operations (POST/PUT/DELETE).

New endpoints are added as needed. If you're looking for a full-featured METRC client, this isn't it.

## Status

Pre-1.0. Used internally by Yerba Buena's inventory apps.

## Install

Currently consumed via git submodule (path alias) by sibling repos. npm publishing TBD.

## Usage

```ts
import { createLiveMetrcClient, NY_PROD_BASE_URL } from "@yerba-buena/metrc-ny-client";

const client = createLiveMetrcClient({
  vendorApiKey: process.env.METRC_VENDOR_API_KEY!,
  userApiKey: process.env.METRC_USER_API_KEY!,
  licenseNumber: process.env.METRC_LICENSE_NUMBER!,
  baseUrl: NY_PROD_BASE_URL,
});

const transfers = await client.getIncomingTransfers();
```

## Development

```bash
npm install
npm test
npm run build
```
