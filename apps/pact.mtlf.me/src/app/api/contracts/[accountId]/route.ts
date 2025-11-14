import { HorizonServiceLive, HorizonServiceTag } from "@/lib/services/horizon-service";
import { IPFSServiceLive, IPFSServiceTag } from "@/lib/services/ipfs-service";
import { Effect, Layer, pipe } from "effect";
import { NextResponse } from "next/server";

const AppLayer = Layer.mergeAll(HorizonServiceLive, IPFSServiceLive);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;


  const program = pipe(
    HorizonServiceTag,
    Effect.flatMap((service) => service.getAccountDataEntries(accountId)),
    Effect.flatMap((dataMap) => {
      // Find ipfshash entries
      const ipfsEntries: Array<{ assetCode: string; cid: string }> = [];

      // Check for generic ipfshash
      const genericCid = dataMap.get("ipfshash");
      if (genericCid) {
        ipfsEntries.push({ assetCode: "DEFAULT", cid: genericCid });
      }

      // Check for ipfshash-<ASSET_CODE> entries
      for (const [key, value] of dataMap.entries()) {
        if (key.startsWith("ipfshash-")) {
          const assetCode = key.substring(9);
          ipfsEntries.push({ assetCode, cid: value });
        }
      }

      if (ipfsEntries.length === 0) {
        return Effect.fail({
          _tag: "ValidationError" as const,
          message: "No ipfshash entries found in account data",
        });
      }

      return Effect.succeed(ipfsEntries);
    }),
    Effect.flatMap((ipfsEntries) =>
      Effect.all(
        ipfsEntries.map(({ assetCode, cid }) =>
          pipe(
            IPFSServiceTag,
            Effect.flatMap((ipfsService) => ipfsService.fetchMetadata(cid)),
            Effect.flatMap((metadata) => {
              // Priority 1: fulldescription field (base64 encoded markdown)
              if (metadata.fulldescription) {
                try {
                  const markdown = Buffer.from(metadata.fulldescription, "base64").toString("utf-8");
                  return Effect.succeed({ assetCode, issuerAccountId: accountId, metadata, markdown });
                } catch {
                  // If base64 decode fails, treat as plain text
                  return Effect.succeed({
                    assetCode,
                    issuerAccountId: accountId,
                    metadata,
                    markdown: metadata.fulldescription
                  });
                }
              }

              // Priority 2: url field (only if it's a CID, not a full URL)
              if (metadata.url && !metadata.url.startsWith("http")) {
                const urlCid = metadata.url;
                return pipe(
                  IPFSServiceTag,
                  Effect.flatMap((ipfsService) =>
                    ipfsService.fetchMarkdown(urlCid)
                  ),
                  Effect.map((markdown) => ({ assetCode, issuerAccountId: accountId, metadata, markdown })),
                  Effect.catchAll(() =>
                    Effect.succeed({ assetCode, issuerAccountId: accountId, metadata, markdown: null })
                  ),
                );
              }

              // No markdown available
              return Effect.succeed({ assetCode, issuerAccountId: accountId, metadata, markdown: null });
            }),
          )
        ),
        { concurrency: 3 },
      )
    ),
    Effect.provide(AppLayer),
  );

  try {
    const contracts = await Effect.runPromise(program);
    return NextResponse.json({ contracts });
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load contracts" },
      { status: 500 }
    );
  }
}
