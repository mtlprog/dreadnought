import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Horizon,
} from "@stellar/stellar-sdk";
import postgres from "postgres";

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || "testnet";
const STELLAR_SERVER_SECRET = process.env.STELLAR_SERVER_SECRET!;
const HOME_DOMAIN = "oghma.org";
const CHALLENGE_TIMEOUT = 300; // 5 minutes

const sql = postgres(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
    }

    // Validate public key format
    try {
      Keypair.fromPublicKey(publicKey);
    } catch {
      return NextResponse.json(
        { error: "Invalid public key format" },
        { status: 400 }
      );
    }

    // Get server keypair
    const serverKeypair = Keypair.fromSecret(STELLAR_SERVER_SECRET);

    // Get network config
    const networkPassphrase =
      STELLAR_NETWORK === "mainnet"
        ? Networks.PUBLIC
        : Networks.TESTNET;

    const horizonUrl =
      STELLAR_NETWORK === "mainnet"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org";

    const server = new Horizon.Server(horizonUrl);

    // Load server account
    const serverAccount = await server.loadAccount(serverKeypair.publicKey());

    // Generate random challenge nonce (будет ID сессии)
    const nonce = Buffer.from(
      Array.from({ length: 48 }, () => Math.floor(Math.random() * 256))
    ).toString("base64");

    // Save nonce to database
    const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT * 1000);
    await sql`
      INSERT INTO auth_sessions (nonce, public_key, expires_at)
      VALUES (${nonce}, ${publicKey}, ${expiresAt})
    `;

    // Create challenge transaction with nonce in manageData
    const transaction = new TransactionBuilder(serverAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.manageData({
          name: `${HOME_DOMAIN} auth`,
          value: nonce, // Nonce будет в manageData
          source: publicKey,
        })
      )
      .setTimeout(CHALLENGE_TIMEOUT)
      .build();

    // Server signs the transaction
    transaction.sign(serverKeypair);

    return NextResponse.json({
      transaction: transaction.toXDR(),
      networkPassphrase,
      nonce, // Возвращаем nonce для отладки (можно убрать в продакшене)
    });
  } catch (error) {
    console.error("Challenge generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate challenge",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
