"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface Manager {
  id: string
  username: string
  name: string | null
  role: string
  isActive: boolean
  campusId: string | null
  campusName: string | null
  createdAt: string
}

interface Campus {
  id: string
  name: string
}

interface AdminManagersProps {
  initialManagers: Manager[]
  campuses: Campus[]
}

export function AdminManagers({ initialManagers, campuses }: AdminManagersProps) {
  const { toast } = useToast()
  const [managers, setManagers] = useState<Manager[]>(initialManagers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingManager, setEditingManager] = useState<Manager | null>(null)
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    campusId: "",
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openCreateDialog = () => {
    setEditingManager(null)
    setForm({
      username: "",
      password: "",
      name: "",
      campusId: "",
      isActive: true,
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (manager: Manager) => {
    setEditingManager(manager)
    setForm({
      username: manager.username,
      password: "",
      name: manager.name || "",
      campusId: manager.campusId || "",
      isActive: manager.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!editingManager && (!form.username || !form.password)) {
      toast({
        title: "오류",
        description: "아이디와 비밀번호는 필수입니다.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingManager) {
        const res = await fetch(`/api/admin/managers/${editingManager.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            password: form.password || undefined,
            campusId: form.campusId || null,
            isActive: form.isActive,
          }),
        })

        if (!res.ok) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || "관리자 수정에 실패했습니다.")
        }

        setManagers((prev) =>
          prev.map((m) =>
            m.id === editingManager.id
              ? {
                  ...m,
                  name: form.name || null,
                  campusId: form.campusId || null,
                  campusName: campuses.find((c) => c.id === form.campusId)?.name || null,
                  isActive: form.isActive,
                }
              : m
          )
        )
        toast({ title: "완료", description: "관리자 정보가 수정되었습니다." })
      } else {
        const res = await fetch("/api/admin/managers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: form.username,
            password: form.password,
            name: form.name,
            campusId: form.campusId || null,
          }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || "관리자 생성에 실패했습니다.")
        }

        // 목록을 새로고침하는 대신 최소 정보만 추가
        setManagers((prev) => [
          {
            id: data.id,
            username: form.username,
            name: form.name || null,
            role: "MANAGER",
            isActive: true,
            campusId: form.campusId || null,
            campusName: campuses.find((c) => c.id === form.campusId)?.name || null,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ])

        toast({ title: "완료", description: "중간 관리자가 생성되었습니다." })
      }

      setIsDialogOpen(false)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "오류",
        description: error.message || "요청 처리에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">관리자 관리</h1>
        <Button onClick={openCreateDialog}>+ 관리자 추가</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>아이디</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>캠퍼스</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.username}</TableCell>
              <TableCell>{m.name || "-"}</TableCell>
              <TableCell>{m.campusName || "-"}</TableCell>
              <TableCell>{m.isActive ? "활성" : "비활성"}</TableCell>
              <TableCell>{new Date(m.createdAt).toLocaleDateString("ko-KR")}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(m)}
                >
                  수정
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingManager ? "관리자 수정" : "관리자 추가"}</DialogTitle>
            <DialogDescription>
              중간 관리자 계정을 {editingManager ? "수정" : "추가"}합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingManager && (
              <div>
                <Label>아이디 *</Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="아이디 입력"
                />
              </div>
            )}
            <div>
              <Label>비밀번호 {editingManager ? "(변경 시만 입력)" : "*"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingManager ? "변경 시 새 비밀번호 입력" : "비밀번호 입력"}
              />
            </div>
            <div>
              <Label>이름 (선택)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="이름 입력"
              />
            </div>
            <div>
              <Label>캠퍼스 (선택)</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.campusId}
                onChange={(e) => setForm({ ...form, campusId: e.target.value })}
              >
                <option value="">선택 안 함</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {editingManager && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">로그인 가능 여부</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {form.isActive ? "활성" : "비활성 (로그인 불가)"}
                  </span>
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

