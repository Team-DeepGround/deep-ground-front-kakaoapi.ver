"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

interface ReportModalProps {
  targetId: number
  targetType: "FEED" | "MEMBER"
  triggerText?: string
  open?: boolean
  setOpen?: (value: boolean) => void
}

export function ReportModal({
  targetId,
  targetType,
  triggerText = "신고",
  open,
  setOpen,
}: ReportModalProps) {
  const { toast } = useToast()
  const [reason, setReason] = useState<"ABUSE" | "SEXUAL_CONTENT" | "SPAM" | "OTHER" | "">("")
  const [content, setContent] = useState("")

  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open !== undefined ? open : internalOpen
  const handleOpenChange = setOpen ?? setInternalOpen

  const handleSubmit = async () => {
    if (!reason || !content.trim()) return

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        toast({ title: "인증 실패", description: "로그인이 필요합니다.", variant: "destructive" })
        return
      }

      await axios.post(
        "/api/v1/report",
        {
          targetType,
          targetId,
          reason,
          content,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      toast({
        title: "신고 완료",
        description: "관리자가 확인 후 조치할 예정입니다.",
      })
      handleOpenChange(false)
      setReason("")
      setContent("")
    } catch (error) {
      toast({
        title: "신고 실패",
        description: "문제가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {triggerText && (
        <DialogTrigger asChild>
          <Button variant="ghost" className="text-red-500 text-sm">
            {triggerText}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="space-y-4">
        <h2 className="text-lg font-semibold">신고하기</h2>

        <div className="space-y-2">
          <Label>신고 사유</Label>
          <Select value={reason} onValueChange={(value) => setReason(value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="신고 사유를 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ABUSE">욕설</SelectItem>
              <SelectItem value="SEXUAL_CONTENT">음란성</SelectItem>
              <SelectItem value="SPAM">광고</SelectItem>
              <SelectItem value="OTHER">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>상세 내용</Label>
          <Textarea
            placeholder="상세한 신고 사유를 입력해주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <Button onClick={handleSubmit} disabled={!reason || !content.trim()}>
          신고 제출
        </Button>
      </DialogContent>
    </Dialog>
  )
}
