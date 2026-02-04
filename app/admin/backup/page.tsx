import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { BackupManagement } from "@/components/admin/backup-management"

export default async function BackupPage() {
  const session = await getServerSession(authOptions)

  // SUPER_ADMIN만 접근 가능
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin")
  }

  return <BackupManagement />
}
