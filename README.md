# @yerba-buena/metrc-ny-client

METRC v2 API client for New York facilities. Live and mock implementations behind a shared interface.

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
