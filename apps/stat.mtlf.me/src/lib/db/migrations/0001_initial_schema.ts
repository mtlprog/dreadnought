import { Effect } from "effect";
import { SqlClient } from "@effect/sql";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) => Effect.gen(function* () {
    // Create fund_entities table
    yield* sql`
      CREATE TABLE IF NOT EXISTS fund_entities (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create fund_snapshots table
    yield* sql`
      CREATE TABLE IF NOT EXISTS fund_snapshots (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER NOT NULL REFERENCES fund_entities(id) ON DELETE CASCADE,
        snapshot_date DATE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        UNIQUE (entity_id, snapshot_date)
      )
    `;

    // Create index for faster queries by date
    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_fund_snapshots_entity_date
      ON fund_snapshots(entity_id, snapshot_date DESC)
    `;

    // Create index for JSONB data queries
    yield* sql`
      CREATE INDEX IF NOT EXISTS idx_fund_snapshots_data
      ON fund_snapshots USING GIN (data)
    `;

    // Insert default MTLF entity
    yield* sql`
      INSERT INTO fund_entities (slug, name, description)
      VALUES (
        'mtlf',
        'Montelibero Fund',
        'Фонд Монтелиберо - зонтичная структура для управления активами на Stellar'
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  })
);
