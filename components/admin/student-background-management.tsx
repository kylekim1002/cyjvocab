"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Trash2, RefreshCw } from "lucide-react"
import { Label } from "@/components/ui/label"

type Row = {
  id: string
  label: string | null
  storagePath: string
  publicUrl: string
  isActive: boolean
  createdAt: string
}

export function StudentBackgroundManagement() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toggleId, setToggleId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/student-backgrounds")
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || "목록을 불러올 수 없습니다.")
      }
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      toast({
        title: "오류",
        description: e instanceof Error ? e.message : "목록 오류",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const patchActive = async (id: string, isActive: boolean) => {
    setToggleId(id)
    try {
      const res = await fetch(`/api/admin/student-backgrounds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || "저장 실패")
      toast({ title: isActive ? "이 배경을 활성화했습니다" : "비활성화했습니다" })
      await load()
    } catch (e: unknown) {
      toast({
        title: "오류",
        description: e instanceof Error ? e.message : "저장 오류",
        variant: "destructive",
      })
    } finally {
      setToggleId(null)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const file = files[0]
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (labelDraft.trim()) formData.append("label", labelDraft.trim())
      const res = await fetch("/api/admin/student-backgrounds", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || "업로드 실패")
      toast({ title: "업로드 완료", description: "적용하려면 목록에서 활성화하세요." })
      setLabelDraft("")
      await load()
    } catch (err: unknown) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "업로드 오류",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 배경을 삭제할까요? (저장소 파일도 함께 삭제됩니다)")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/student-backgrounds/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error || "삭제 실패")
      toast({ title: "삭제됨" })
      await load()
    } catch (err: unknown) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "삭제 오류",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 앱 배경</CardTitle>
        <CardDescription>
          WebP만 업로드할 수 있습니다. <strong>활성</strong>은 전체 앱에서 항상 0~1개입니다. 활성이 없으면 학생
          화면은 기본(회색 배경)만 사용됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="bg-label">메모 (선택, 업로드 시 함께 저장)</Label>
            <Input
              id="bg-label"
              placeholder="예: 2025 봄 시즌"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              disabled={uploading}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              새로고침
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/webp,.webp"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "업로드 중…" : "WebP 업로드"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">미리보기</TableHead>
                <TableHead>메모</TableHead>
                <TableHead className="w-[100px]">활성</TableHead>
                <TableHead className="w-[100px] text-right">삭제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    불러오는 중…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    등록된 배경이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.publicUrl}
                        alt=""
                        className="h-14 w-24 rounded object-cover border bg-muted"
                      />
                    </TableCell>
                    <TableCell className="text-sm">{r.label || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.isActive}
                        disabled={toggleId === r.id}
                        onCheckedChange={(v) => patchActive(r.id, v)}
                        aria-label={r.isActive ? "비활성화" : "활성화"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                        aria-label="삭제"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
