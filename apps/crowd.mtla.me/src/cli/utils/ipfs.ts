import type { ProjectData } from "@/lib/stellar/types";
import { Effect, pipe } from "effect";
import { ValidationError } from "../types";

/**
 * Получает CID проекта из Stellar manageData
 */
const getProjectCid = (assetCode: string): Effect.Effect<string, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const { getStellarConfig } = await import("@/lib/stellar/config");
        const configEffect = getStellarConfig();
        const config = await Effect.runPromise(configEffect);

        const account = await config.server.loadAccount(config.publicKey);
        const dataKey = `ipfshash-P${assetCode}`;
        const data = account.data_attr[dataKey];

        if (data === undefined) {
          throw new Error(`No IPFS hash found for P${assetCode}`);
        }

        // Decode base64 to string
        return Buffer.from(data, "base64").toString("utf-8");
      },
      catch: (error) =>
        new ValidationError({
          field: "ipfs_cid",
          message: `Failed to get IPFS CID: ${error}`,
        }),
    }),
  );

/**
 * Загружает данные проекта из IPFS по CID
 */
const fetchFromIPFS = (cid: string): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);

        if (!response.ok) {
          throw new Error(`IPFS fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data as ProjectData;
      },
      catch: (error) =>
        new ValidationError({
          field: "ipfs_data",
          message: `Failed to fetch from IPFS: ${error}`,
        }),
    }),
  );

/**
 * Получает данные проекта из Stellar + IPFS
 */
export const fetchProjectFromIPFS = (assetCode: string): Effect.Effect<ProjectData, ValidationError> =>
  pipe(
    getProjectCid(assetCode),
    Effect.flatMap(cid => fetchFromIPFS(cid)),
  );
