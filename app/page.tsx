import { redirect } from "next/navigation"

export default function HomePage() {
  // Always route root to dashboard; auth is enforced on /dashboard
  redirect("/dashboard")
}
