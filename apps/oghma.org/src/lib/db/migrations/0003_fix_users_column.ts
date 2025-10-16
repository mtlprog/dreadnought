import { Effect } from "effect";
import { SqlClient } from "@effect/sql";

export const up = Effect.flatMap(SqlClient.SqlClient, (sql) =>
  Effect.gen(function* () {
    // Rename column if it exists with old name
    yield* sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'stellar_account_id'
        ) THEN
          ALTER TABLE users RENAME COLUMN stellar_account_id TO stellar_public_key;
        END IF;
      END $$;
    `;

    // Drop old index
    yield* sql`DROP INDEX IF EXISTS idx_users_stellar_account`;

    // Create new index
    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_users_stellar_public_key
      ON users(stellar_public_key)
    `;

    // Add updated_at column if it doesn't exist
    yield* sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `;
  })
);

export const down = Effect.flatMap(SqlClient.SqlClient, (sql) =>
  sql`
    ALTER TABLE users
    RENAME COLUMN stellar_public_key TO stellar_account_id;

    DROP INDEX IF EXISTS idx_users_stellar_public_key;

    CREATE INDEX IF NOT EXISTS idx_users_stellar_account
    ON users(stellar_account_id);

    ALTER TABLE users
    DROP COLUMN IF EXISTS updated_at;
  `
);
