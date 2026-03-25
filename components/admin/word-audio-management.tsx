"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Trash2, RefreshCw, Search } from "lucide-react"
import { normalizeWordAudioKey } from "@/lib/word-audio"

type WordAudioRow = {
  id: string
  normalizedKey: string
  publicUrl: string
  storagePath: string
  originalFilename: string
  createdAt: string
}

export function WordAudioManagement() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<WordAudioRow[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.normalizedKey.toLowerCase().includes(q) ||
        r.originalFilename.toLowerCase().includes(q) ||
        r.publicUrl.toLowerCase().includes(q) ||
        r.storagePath.toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/word-audio")
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "목록을 불러올 수 없습니다.")
      }
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast({
        title: "오류",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i])
      }
      const res = await fetch("/api/admin/word-audio", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "업로드 실패")
      toast({
        title: "업로드 결과",
        description: data.message || "완료",
      })
      if (Array.isArray(data.results)) {
        const failed = data.results.filter((r: { ok: boolean }) => !r.ok)
        if (failed.length) {
          console.warn("Upload partial failures:", failed)
        }
      }
      await load()
    } catch (err: any) {
      toast({
        title: "오류",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 음원을 삭제할까요?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/word-audio/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "삭제 실패")
      toast({ title: "삭제됨" })
      await load()
    } catch (err: any) {
      toast({
        title: "오류",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>음원 풀</CardTitle>
        <CardDescription>
          파일명이 단어와 같아야 합니다 (예: <code className="text-xs">apple.mp3</code>,{" "}
          <code className="text-xs">ice_cream.mp3</code>는 단어 &quot;ice cream&quot;과 매칭). 저장 경로:{" "}
          <code className="text-xs">pool/&#123;키&#125;.mp3</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={handleFiles}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "업로드 중…" : "MP3 일괄 업로드"}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          정규화 키 예: 단어 &quot;Hello&quot; → <code>{normalizeWordAudioKey("Hello")}</code>
        </p>

        <div className="space-y-2">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="키, 파일명, 경로로 검색…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="음원 검색"
            />
          </div>
          {!loading && rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filteredRows.length}개 표시 (전체 {rows.length}개)
            </p>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>키 (매칭용)</TableHead>
                <TableHead>원본 파일명</TableHead>
                <TableHead className="hidden md:table-cell">URL</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4}>불러오는 중…</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    등록된 음원이 없습니다.
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.normalizedKey}</TableCell>
                    <TableCell className="text-sm">{r.originalFilename}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[280px] truncate text-xs text-muted-foreground">
                      <a href={r.publicUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        열기
                      </a>
                    </TableCell>
                    <TableCell>
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
