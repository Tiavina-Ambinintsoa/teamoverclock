export interface CityProjectStats {
  project_id: string
  service_id: string
  title: string
  status: "draft" | "published" | "closed"
  yes_votes: number
  no_votes: number
  comment_count: number
}

export function canParticipateInCivicVoting(kycStatus: string | null | undefined): boolean {
  return kycStatus === "verified"
}
