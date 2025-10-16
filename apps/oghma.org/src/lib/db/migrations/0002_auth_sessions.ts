import { Effect } from "effect";
import { SqlClient } from "@effect/sql";

export const up = Effect.flatMap(SqlClient.SqlClient, (sql) =>
  sql`
    CREATE TABLE auth_sessions (
      id SERIAL PRIMARY KEY,
      nonce TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      used BOOLEAN DEFAULT FALSE
    );

    CREATE INDEX idx_auth_sessions_nonce ON auth_sessions(nonce);
    CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
  `
);

export const down = Effect.flatMap(SqlClient.SqlClient, (sql) =>
  sql`
    DROP TABLE IF EXISTS auth_sessions;
  `
);
