import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  Networks,
  Transaction,
} from "@stellar/stellar-sdk";
import postgres from "postgres";
import { createSession, setSessionCookie } from "@/lib/stellar/session";

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || "testnet";
const STELLAR_SERVER_SECRET = process.env.STELLAR_SERVER_SECRET!;
const HOME_DOMAIN = "oghma.org";

const sql = postgres(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    // SEP-0007 callback может передавать xdr в body или query
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const xdr = body.xdr || url.searchParams.get("xdr");

    if (!xdr) {
      return NextResponse.json(
        { error: "xdr parameter is required" },
        { status: 400 }
      );
    }

    // Get server keypair
    const serverKeypair = Keypair.fromSecret(STELLAR_SERVER_SECRET);

    // Get network passphrase
    const networkPassphrase =
      STELLAR_NETWORK === "mainnet"
        ? Networks.PUBLIC
        : Networks.TESTNET;

    // Parse signed transaction
    const transaction = new Transaction(xdr, networkPassphrase);

    // Verify transaction structure
    if (transaction.operations.length !== 1) {
      return NextResponse.json(
        { error: "Invalid transaction: must have exactly one operation" },
        { status: 400 }
      );
    }

    const operation = transaction.operations[0];
    if (operation.type !== "manageData") {
      return NextResponse.json(
        { error: "Invalid transaction: operation must be manageData" },
        { status: 400 }
      );
    }

    // Extract nonce from manageData
    const dataName = `${HOME_DOMAIN} auth`;
    if (operation.name !== dataName) {
      return NextResponse.json(
        { error: `Invalid transaction: manageData name must be "${dataName}"` },
        { status: 400 }
      );
    }

    if (!operation.value) {
      return NextResponse.json(
        { error: "Invalid transaction: manageData value is empty" },
        { status: 400 }
      );
    }

    const nonce = operation.value.toString();
    const clientPublicKey = operation.source!;

    // Verify transaction is not expired
    const now = Math.floor(Date.now() / 1000);
    if (
      transaction.timeBounds &&
      Number(transaction.timeBounds.maxTime) < now
    ) {
      return NextResponse.json(
        { error: "Transaction expired" },
        { status: 400 }
      );
    }

    // Verify transaction has 2 signatures
    if (transaction.signatures.length !== 2) {
      return NextResponse.json(
        { error: "Invalid transaction: must have exactly 2 signatures" },
        { status: 400 }
      );
    }

    // Verify server signature
    const serverSignature = transaction.signatures.find((sig) =>
      serverKeypair.verify(transaction.hash(), sig.signature())
    );
    if (!serverSignature) {
      return NextResponse.json(
        { error: "Server signature not found or invalid" },
        { status: 400 }
      );
    }

    // Verify client signature
    const clientKeypair = Keypair.fromPublicKey(clientPublicKey);
    const clientSignature = transaction.signatures.find((sig) =>
      clientKeypair.verify(transaction.hash(), sig.signature())
    );
    if (!clientSignature) {
      return NextResponse.json(
        { error: "Client signature not found or invalid" },
        { status: 400 }
      );
    }

    // Find nonce in database
    const sessions = await sql`
      SELECT * FROM auth_sessions
      WHERE nonce = ${nonce}
        AND public_key = ${clientPublicKey}
        AND expires_at > NOW()
        AND used = FALSE
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired auth session" },
        { status: 400 }
      );
    }

    // Mark session as used
    await sql`
      UPDATE auth_sessions
      SET used = TRUE
      WHERE nonce = ${nonce}
    `;

    // Create or get user
    const users = await sql`
      INSERT INTO users (stellar_public_key)
      VALUES (${clientPublicKey})
      ON CONFLICT (stellar_public_key)
      DO UPDATE SET updated_at = NOW()
      RETURNING id, stellar_public_key
    `;

    const user = users[0];
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create JWT session
    const token = await createSession(clientPublicKey, user.id);
    await setSessionCookie(token);

    // Return success with redirect
    // SEP-0007 expects redirect or success response
    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      publicKey: clientPublicKey,
      userId: user.id,
    });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json(
      {
        error: "Failed to process callback",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Also support GET for SEP-0007 callback
export async function GET(request: NextRequest) {
  return POST(request);
}
