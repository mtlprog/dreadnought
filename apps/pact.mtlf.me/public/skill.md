---
name: notarize
description: Issue NFT contract certificates on Stellar blockchain. Use when the user asks to notarize a document, issue an NFT contract, or distribute contract tokens to Stellar accounts.
disable-model-invocation: true
argument-hint: [contract description or file path]
allowed-tools: Bash, Read, Glob, Grep, WebFetch
---

# NFT Contract Notarization on Stellar

Issue non-fungible token certificates on Stellar. Each NFT is a contract document stored on IPFS (SEP-0039 + Litemint `fulldescription` extension). Output: unsigned XDR transaction.

## Configuration

Read from the project's CLAUDE.md or user settings. **All values are required** — ask the user if any are missing.

- `NOTARY_ISSUER` — Stellar pubkey of the NFT issuer (must have AuthRequired + AuthRevocable + AuthClawbackEnabled)
- `NOTARY_SPONSOR` — Stellar pubkey of the sponsor (pays reserves and fees)
- `PINATA_JWT` — Pinata API JWT token
- `PINATA_GATEWAY` — Pinata gateway domain (e.g. `xxx.mypinata.cloud`)
- `PINATA_GROUP_ID` — Pinata public group/folder UUID

## Step 1: Gather Parameters

Extract from the user's request:
- **Document** — file path or ready IPFS hash (`bafkrei...` / `Qm...`)
- **Asset code** — up to 12 alphanumeric chars (e.g. `MABIZ`). Derive from contract name if not given.
- **NFT name** — human-readable (e.g. "MABIZ Contract")
- **NFT description** — short summary (1-2 sentences)
- **Recipients** — Stellar public keys (G-addresses)
- **Memo** — up to 28 bytes. Derive from asset code if not given.

Ask the user if anything is unclear.

## Step 2: Upload to IPFS (two uploads)

The on-chain `manageData` stores the CID of the **metadata JSON**, not the raw document.

### 2a: Upload raw document

```bash
curl -s -X POST "https://uploads.pinata.cloud/v3/files" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@/path/to/document" \
  -F "name=ASSET_CODE-document" \
  -F "network=public" \
  -F "group_id=$PINATA_GROUP_ID" | jq -r '.data.cid'
```

Save result as `DOCUMENT_CID`. **Always pass `network=public`** — without it files are private and inaccessible.

### 2b: Create and upload SEP-0039 metadata JSON

Generate `fulldescription` (base64-encoded full contract text):
```bash
base64 -i /path/to/document
```

Create JSON (all fields required):
```json
{
  "name": "NFT_NAME",
  "description": "SHORT_DESCRIPTION",
  "image": "ipfs://DOCUMENT_CID",
  "url": "https://ipfs.io/ipfs/DOCUMENT_CID",
  "code": "ASSET_CODE",
  "issuer": "NOTARY_ISSUER",
  "fulldescription": "BASE64_ENCODED_FULL_TEXT"
}
```

Upload:
```bash
curl -s -X POST "https://uploads.pinata.cloud/v3/files" \
  -H "Authorization: Bearer $PINATA_JWT" \
  -F "file=@/path/to/metadata.json" \
  -F "name=ASSET_CODE-metadata" \
  -F "network=public" \
  -F "group_id=$PINATA_GROUP_ID" | jq -r '.data.cid'
```

Save result as `METADATA_CID` — this goes into `manageData` on-chain.

## Step 3: Build Transaction

Transaction structure:
```
beginSponsoringFutureReserves  (SPONSOR → ISSUER)
  [per RECIPIENT]:
    changeTrust                (RECIPIENT, limit: 0.0000001)
    setTrustLineFlags          (ISSUER authorizes)
    payment                    (ISSUER → RECIPIENT, 1 STROOP)
  manageData                   ("ipfshash-ASSET_CODE" = METADATA_CID)
endSponsoringFutureReserves    (ISSUER)
```

Build with `bun --eval` (requires `@stellar/stellar-sdk`):

```bash
bun --eval '
import { Asset, BASE_FEE, Horizon, Memo, MemoText, Networks, Operation, TimeoutInfinite, TransactionBuilder } from "@stellar/stellar-sdk";

const STROOP = "0.0000001";
const issuer = "ISSUER_PUBKEY";
const sponsor = "SPONSOR_PUBKEY";
const assetCode = "ASSET_CODE";
const metadataCid = "METADATA_CID";
const recipients = ["RECIPIENT_1", "RECIPIENT_2"];
const memo = "MEMO_TEXT";

const asset = new Asset(assetCode, issuer);
const ops = [];

ops.push(Operation.beginSponsoringFutureReserves({ sponsoredId: issuer, source: sponsor }));

for (const r of recipients) {
  ops.push(
    Operation.changeTrust({ asset, limit: STROOP, source: r }),
    Operation.setTrustLineFlags({ trustor: r, asset, flags: { authorized: true }, source: issuer }),
    Operation.payment({ amount: STROOP, asset, destination: r, source: issuer }),
  );
}

ops.push(Operation.manageData({ name: "ipfshash-" + assetCode, value: metadataCid, source: issuer }));
ops.push(Operation.endSponsoringFutureReserves({ source: issuer }));

const account = await new Horizon.Server("https://horizon.stellar.org").loadAccount(sponsor);
const txb = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC })
  .addMemo(new Memo(MemoText, memo)).setTimeout(TimeoutInfinite);
ops.forEach(op => txb.addOperation(op));
console.log(txb.build().toXDR());
'
```

Replace all placeholders with actual values.

## Step 4: Present Results

Show the user:
1. Document IPFS link + Metadata IPFS link
2. Asset code and issuer
3. Recipients list
4. Operations count (3 per recipient + 3 overhead)
5. **Unsigned XDR** (copy to clipboard with `| pbcopy` if on macOS)
6. Required signers:
   - **Sponsor** — `beginSponsoringFutureReserves`
   - **Each recipient** — their `changeTrust`
   - **Issuer** — `setTrustLineFlags`, `payment`, `manageData`, `endSponsoringFutureReserves`

## Critical Rules

**Operation ordering** (violating = transaction failure):
1. `beginSponsoring` → sponsored ops → `endSponsoring`
2. `changeTrust` → `setTrustLineFlags` → `payment` (per recipient)
3. `manageData` inside sponsorship block (costs 0.5 XLM reserve)
4. `endSponsoringFutureReserves` must be sourced by the **issuer**, not the sponsor
5. Max ~32 recipients per transaction (100 ops limit, 3 per recipient + 3 overhead)

**Asset code**: 1-12 alphanumeric (A-Z, a-z, 0-9), unique per issuer.

**Memo**: max 28 bytes.

**`manageData` value**: max 64 bytes (CIDv1 `bafkrei...` is ~59 bytes, fits).
