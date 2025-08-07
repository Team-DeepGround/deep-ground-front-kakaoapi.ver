import { useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Participant } from "@/types/study"
import { api } from "@/lib/api-client"
import { Button } from "../ui/button"
import { ReportModal } from "@/components/report/report-modal"

interface ParticipantListProps {
  studyId: number
  writerId: number
  groupLimit: number
}

export function ParticipantList({ studyId, writerId, groupLimit }: ParticipantListProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [reportTargetId, setReportTargetId] = useState<number | null>(null)

  useEffect(() => {
    if (!studyId) return

    const fetchParticipants = async () => {
      try {
        const res = await api.get(`/study-group/${studyId}/participants`)
        setParticipants(res.result)
      } catch (e) {
        console.error("Failed to fetch participants", e)
      }
    }

    fetchParticipants()
  }, [studyId])

  const leader = participants.find((p) => p.memberId === writerId)
  const others = participants.filter((p) => p.memberId !== writerId)

  const handleReportClick = (memberId: number) => {
    setReportTargetId(memberId)
  }

  const handleReportClose = () => {
    setReportTargetId(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>참여자 목록</span>
            <span className="text-sm text-muted-foreground">
              {participants.length}/{groupLimit}명
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leader && (
              <div className="flex items-center gap-4 p-2 border rounded-lg">
                <Avatar>
                  <AvatarFallback>{leader.nickname.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{leader.nickname}</div>
                </div>
                <Badge variant="secondary">스터디장</Badge>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/profile/${leader.profileId}`}>프로필</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReportClick(leader.memberId)}>
                  신고
                </Button>
              </div>
            )}
            {others.map((p) => (
              <div key={p.memberId} className="flex items-center gap-4 p-2 border rounded-lg">
                <Avatar>
                  <AvatarFallback>{p.nickname.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{p.nickname}</div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/profile/${p.profileId}`}>프로필</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReportClick(p.memberId)}>
                  신고
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {reportTargetId !== null && (
        <ReportModal
          targetId={reportTargetId}
          targetType="MEMBER"
          open={true}
          setOpen={handleReportClose}
          triggerText="" // 수동 컨트롤이므로 트리거 텍스트 없음
        />
      )}
    </>
  )
}
