import * as S from "@effect/schema/Schema"

// Project data schema (from CLI)
export const ProjectData = S.Struct({
  name: S.String,
  code: S.String,
  description: S.String,
  contact_account_id: S.String,
  project_account_id: S.String,
  target_amount: S.String,
  deadline: S.String,
})
export type ProjectData = S.Schema.Type<typeof ProjectData>

// Enhanced project info for frontend
export interface ProjectInfo {
  readonly name: string
  readonly code: string
  readonly description: string
  readonly contact_account_id: string
  readonly project_account_id: string
  readonly target_amount: string
  readonly deadline: string
  readonly current_amount: string
  readonly supporters_count: number
  readonly ipfsUrl: string
  readonly status: "active" | "completed" | "expired"
}
