"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

export function StudentLogoutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      로그아웃
    </Button>
  )
}
