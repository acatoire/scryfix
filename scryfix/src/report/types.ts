// Report schema v1.0 — see doc/project-plan.md §6.

export interface ReportImageItem {
  type: 'image'
  path: string
  purpose?: string
}

export interface ReportUrlItem {
  type: 'url'
  value: string
}

export type ReportAttachmentItem = ReportImageItem | ReportUrlItem

export interface ReportExternalRef {
  source: string
  url: string
}

export interface Report {
  schema_version: '1.0'
  report_id: string
  created_at: string
  error_type: string
  card: {
    set: string
    collector_number: string
    scryfall_id: string
    name: string
    lang: string
    scryfall_url: string
  }
  unlisted: {
    is_unlisted: boolean
    set_code: string | null
    collector_number_hash: string | null
  }
  details: Record<string, unknown>
  description: string
  evidence: ReportAttachmentItem[]
  fix_files: ReportAttachmentItem[]
  external_refs: ReportExternalRef[]
  reporter: { github_username: string | null }
  // Extension beyond the §6 example: lets a report ship without every required asset (the wizard's
  // "submit as incomplete" option) while flagging what's still missing for the community to add.
  incomplete: boolean
  missing: string[]
}
