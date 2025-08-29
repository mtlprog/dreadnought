export interface Project {
  id: string
  name: string
  code: string
  description: string
  contact_account_id: string
  project_account_id: string
  target_amount: string
  deadline: string
  current_amount: string
  supporters_count: number
  status: "active" | "completed" | "expired"
}
