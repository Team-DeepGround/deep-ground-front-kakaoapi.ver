import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ReportModal } from "@/components/report/report-modal" // ✅ 신고 모달 import

interface StudyMember {
  memberId: number
  profileId: number
  nickname: string
  joinedAt: string
  owner: boolean
}

interface StudyMembersProps {
  members: StudyMember[]
  onInviteMember: (email: string) => void
  onKickMember: (memberId: number) => void
}

export function StudyMembers({ members, onInviteMember, onKickMember }: StudyMembersProps) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [kickMemberId, setKickMemberId] = useState<number | null>(null)
  const [showKickDialog, setShowKickDialog] = useState(false)
  const [reportTargetId, setReportTargetId] = useState<number | null>(null) // ✅ 신고 대상 상태
  const { toast } = useToast()

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast({
        title: "유효하지 않은 이메일",
        description: "유효한 이메일 주소를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    onInviteMember(inviteEmail)
    setInviteEmail("")
  }

  const openKickDialog = (memberId: number) => {
    setKickMemberId(memberId)
    setShowKickDialog(true)
  }

  const handleKickMember = () => {
    if (!kickMemberId) return
    onKickMember(kickMemberId)
    setShowKickDialog(false)
    setKickMemberId(null)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>참여자 관리</CardTitle>
            <CardDescription>스터디 참여자를 관리하세요</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.memberId} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{member.nickname[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.nickname}</p>
                      {member.owner && <Badge variant="secondary">스터디장</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      참여일: {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/profile/${member.profileId}`}>프로필</Link>
                  </Button>
                  {!member.owner && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => openKickDialog(member.memberId)}
                      >
                        강퇴
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReportTargetId(member.memberId)}
                      >
                        신고
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        {/* 강퇴 다이얼로그 */}
        <Dialog open={showKickDialog} onOpenChange={setShowKickDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>멤버 강퇴</DialogTitle>
              <DialogDescription>
                정말로 이 멤버를 강퇴하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowKickDialog(false)}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleKickMember}>
                강퇴하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>

      {/* ✅ 신고 모달 */}
      {reportTargetId !== null && (
        <ReportModal
          targetId={reportTargetId}
          targetType="MEMBER"
          open={true}
          setOpen={() => setReportTargetId(null)}
          triggerText=""
        />
      )}
    </>
  )
}
