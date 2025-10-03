import * as S from "@effect/schema/Schema";

// Base64 validation schema
const Base64String = S.String.pipe(
  S.filter(
    (s: string) => {
      try {
        return globalThis.btoa(globalThis.atob(s)) === s;
      } catch {
        return false;
      }
    },
    { message: () => "Must be a valid base64 encoded string" },
  ),
);

// Base project data schema - single source of truth
export const ProjectDataSchema = S.Struct({
  name: S.String,
  code: S.String,
  description: S.String,
  fulldescription: Base64String,
  contact_account_id: S.String,
  project_account_id: S.String,
  target_amount: S.String,
  deadline: S.String,
});
export type ProjectData = S.Schema.Type<typeof ProjectDataSchema>;

// Supporter contribution schema
export const SupporterContributionSchema = S.Struct({
  account_id: S.String,
  amount: S.String,
});
export type SupporterContribution = S.Schema.Type<typeof SupporterContributionSchema>;

// Extended project data schema with funding results
export const ProjectDataWithResultsSchema = S.Struct({
  name: S.String,
  code: S.String,
  description: S.String,
  fulldescription: Base64String,
  contact_account_id: S.String,
  project_account_id: S.String,
  target_amount: S.String,
  deadline: S.String,
  // Funding results - added when project completes
  funded_amount: S.optional(S.String),
  supporters_count: S.optional(S.Number),
  remaining_amount: S.optional(S.String),
  funding_status: S.optional(S.Literal("completed", "canceled")),
  supporters: S.optional(S.Array(SupporterContributionSchema)),
});
export type ProjectDataWithResults = S.Schema.Type<typeof ProjectDataWithResultsSchema>;

// Extended project info for frontend (wraps base + additional fields)
export interface ProjectInfo extends ProjectDataWithResults {
  readonly current_amount: string;
  readonly supporters_count: number;
  readonly ipfsUrl: string;
  readonly status: "active" | "completed" | "canceled" | "expired";
}

// CLI-specific project info (wraps base + CLI-specific fields)
export interface CliProjectInfo extends ProjectData {
  readonly ipfsUrl: string;
  readonly status: "claimed" | "claimable";
}
