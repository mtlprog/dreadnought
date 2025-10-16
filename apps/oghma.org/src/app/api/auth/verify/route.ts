import { type NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  Networks,
  Transaction,
} from "@stellar/stellar-sdk";
import { createSession, setSessionCookie } from "@/lib/stellar/session";
import postgres from "postgres";

const STELLAR_NETWORK = process.env["STELLAR_NETWORK"] || "testnet";
const STELLAR_SERVER_SECRET = process.env["STELLAR_SERVER_SECRET"]!;
// const HOME_DOMAIN = "oghma.org"; // Unused in this route

const sql = postgres(process.env["DATABASE_URL"]!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction: signedTransactionXDR, publicKey } = body;

    if (!signedTransactionXDR || !publicKey) {
      return NextResponse.json(
        { error: "transaction and publicKey are required" },
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

    // Parse and verify the transaction
    const transaction = new Transaction(
      signedTransactionXDR,
      networkPassphrase
    );

    // Verify transaction structure
    if (transaction.operations.length !== 1) {
      return NextResponse.json(
        { error: "Invalid transaction: must have exactly one operation" },
        { status: 400 }
      );
    }

    const operation = transaction.operations[0];
    if (!operation || operation.type !== "manageData") {
      return NextResponse.json(
        { error: "Invalid transaction: operation must be manageData" },
        { status: 400 }
      );
    }

    // Verify operation source matches client
    if (operation.source !== publicKey) {
      return NextResponse.json(
        { error: "Invalid transaction: operation source doesn't match client" },
        { status: 400 }
      );
    }

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
        { error: "Server signature not found" },
        { status: 400 }
      );
    }

    // Verify client signature
    const clientKeypair = Keypair.fromPublicKey(publicKey);
    const clientSignature = transaction.signatures.find((sig) =>
      clientKeypair.verify(transaction.hash(), sig.signature())
    );
    if (!clientSignature) {
      return NextResponse.json(
        { error: "Client signature not found" },
        { status: 400 }
      );
    }

    // All verifications passed! Create or get user
    const users = await sql`
      INSERT INTO users (stellar_public_key)
      VALUES (${publicKey})
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

    // Create session token
    const token = await createSession(publicKey, user["id"]);

    // Set session cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      publicKey,
      userId: user["id"],
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify challenge",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
