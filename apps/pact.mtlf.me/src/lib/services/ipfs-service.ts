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
    // Validate and construct URL
    const getValidatedUrl = (): Effect.Effect<string, IPFSError> => {
      // If it's already a full URL, validate it
      if (cidOrUrl.startsWith("http")) {
        try {
          const parsedUrl = new URL(cidOrUrl);
          // Only allow IPFS gateways (ipfs.io, cloudflare-ipfs.com, etc.)
          const allowedHosts = ["ipfs.io", "cloudflare-ipfs.com", "gateway.pinata.cloud"];
          if (!allowedHosts.some((host) => parsedUrl.hostname.endsWith(host))) {
            return Effect.fail(
              new IPFSError({
                message: `URL host not allowed: ${parsedUrl.hostname}`,
                cid: cidOrUrl,
                cause: new Error("SSRF prevention: only IPFS gateways allowed"),
              }),
            );
          }
          return Effect.succeed(cidOrUrl);
        } catch {
          return Effect.fail(
            new IPFSError({
              message: "Invalid URL format",
              cid: cidOrUrl,
              cause: new Error("Failed to parse URL"),
            }),
          );
        }
      }
      // Otherwise treat as CID
      return Effect.succeed(`${IPFS_GATEWAY}/${cidOrUrl}`);
    };

    return pipe(
      getValidatedUrl(),
      Effect.flatMap((url) =>
        Effect.tryPromise({
          try: () => fetch(url),
          catch: (error) =>
            new IPFSError({
              message: "Failed to fetch markdown from IPFS",
              cid: cidOrUrl,
              cause: error,
            }),
        })
      ),
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
      Effect.tap((text) => Effect.log(`Fetched markdown from IPFS (${text.length} bytes)`)),
    );
  },
});
