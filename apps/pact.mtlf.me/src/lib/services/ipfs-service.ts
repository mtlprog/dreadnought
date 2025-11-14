import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, pipe } from "effect";
import { IPFSError } from "../errors";
import { ContractMetadata } from "@/types";

const IPFS_GATEWAY = "https://ipfs.io/ipfs";

// Service interface
export interface IPFSService {
  readonly fetchMetadata: (
    cid: string,
  ) => Effect.Effect<ContractMetadata, IPFSError>;
  readonly fetchMarkdown: (
    cid: string,
  ) => Effect.Effect<string, IPFSError>;
}

export const IPFSServiceTag = Context.GenericTag<IPFSService>(
  "@services/IPFSService",
);

// Service implementation
export const IPFSServiceLive = Layer.succeed(IPFSServiceTag, {
  fetchMetadata: (cid: string) =>
    pipe(
      Effect.tryPromise({
        try: () => fetch(`${IPFS_GATEWAY}/${cid}`),
        catch: (error) =>
          new IPFSError({
            message: "Failed to fetch from IPFS",
            cid,
            cause: error,
          }),
      }),
      Effect.flatMap((response) =>
        Effect.tryPromise({
          try: () => response.json(),
          catch: (error) =>
            new IPFSError({
              message: "Failed to parse IPFS metadata JSON",
              cid,
              cause: error,
            }),
        })
      ),
      Effect.flatMap((json) =>
        S.decodeUnknown(ContractMetadata)(json, {
          errors: "all",
          onExcessProperty: "ignore",
        })
      ),
      Effect.mapError((error) =>
        error instanceof IPFSError
          ? error
          : new IPFSError({
              message: "Invalid metadata schema",
              cid,
              cause: error,
            })
      ),
      Effect.tap(() => Effect.log(`Fetched metadata from IPFS: ${cid}`)),
    ),

  fetchMarkdown: (cidOrUrl: string) => {
    // If it's already a full URL, use it directly
    const url = cidOrUrl.startsWith("http") ? cidOrUrl : `${IPFS_GATEWAY}/${cidOrUrl}`;

    return pipe(
      Effect.tryPromise({
        try: () => fetch(url),
        catch: (error) =>
          new IPFSError({
            message: "Failed to fetch markdown from IPFS",
            cid: cidOrUrl,
            cause: error,
          }),
      }),
      Effect.flatMap((response) =>
        Effect.tryPromise({
          try: () => response.text(),
          catch: (error) =>
            new IPFSError({
              message: "Failed to read markdown content",
              cid: cidOrUrl,
              cause: error,
            }),
        })
      ),
      Effect.tap(() => Effect.log(`Fetched markdown from IPFS: ${url}`)),
    );
  },
});
