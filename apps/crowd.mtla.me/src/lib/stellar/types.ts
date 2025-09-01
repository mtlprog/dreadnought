import * as S from "@effect/schema/Schema";

// Base project data schema - single source of truth
export const ProjectDataSchema = S.Struct({
  name: S.String,
  code: S.String,
  description: S.String,
  contact_account_id: S.String,
  project_account_id: S.String,
  target_amount: S.String,
  deadline: S.String,
});
export type ProjectData = S.Schema.Type<typeof ProjectDataSchema>;

// Extended project info for frontend (wraps base + additional fields)
export interface ProjectInfo extends ProjectData {
  readonly current_amount: string;
  readonly supporters_count: number;
  readonly ipfsUrl: string;
  readonly status: "active" | "completed" | "expired";
}

// CLI-specific project info (wraps base + CLI-specific fields)
export interface CliProjectInfo extends ProjectData {
  readonly ipfsUrl: string;
  readonly status: "claimed" | "claimable";
}
