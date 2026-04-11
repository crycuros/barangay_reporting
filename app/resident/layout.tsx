import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Resident Portal | Brgy. 867",
  description: "Barangay resident portal - announcements, reports, and community updates",
}

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
