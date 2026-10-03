import { NewsManager } from "@/features/admin/news-manager"
import { ServicesManager } from "@/features/admin/services-manager"

export function AdminServicesPage() {
  return <ServicesManager scope="all" />
}
export function AgentServicesPage() {
  return <ServicesManager scope="mine" />
}
export function AdminNewsPage() {
  return <NewsManager scope="all" />
}
export function AgentNewsPage() {
  return <NewsManager scope="mine" />
}
