import { Redacted } from "effect";
import { PgClient } from "@effect/sql-pg";

export const PgLive = PgClient.layer({
  url: Redacted.make(process.env.DATABASE_URL as string),
});

export { PgClient };
