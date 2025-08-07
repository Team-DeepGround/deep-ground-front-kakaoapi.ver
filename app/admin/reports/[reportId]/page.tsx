"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { auth } from "@/lib/auth"
import { ReportDetail } from "@/types/report"

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const router = useRouter()

  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [banDays, setBanDays] = useState(7)

  useEffect(() => {
    const fetchReportDetail = async () => {
      const token = await auth.getToken()
      const role = await auth.getRole()

      if (!token || role !== "ROLE_ADMIN") {
        setUnauthorized(true)
        router.replace("/")
        return
      }

      try {
        const response = await axios.get(`/api/v1/admin/report/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setReport(response.data.result)
      } catch (error) {
        console.error("신고 상세 조회 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReportDetail()
  }, [reportId, router])

  const handleDeleteFeed = async () => {
    const token = await auth.getToken()
    await axios.post(`/api/v1/admin/report/${reportId}/delete-feed`, null, {
      headers: { Authorization: `Bearer ${token}` },
    })
    alert("피드가 삭제되고 신고가 처리되었습니다.")
    router.push("/admin/reports")
  }

  const handleKeepFeed = async () => {
    const token = await auth.getToken()
    await axios.post(`/api/v1/admin/report/${reportId}/keep-feed`, null, {
      headers: { Authorization: `Bearer ${token}` },
    })
    alert("피드를 유지하고 신고를 처리했습니다.")
    router.push("/admin/reports")
  }

  const handleBanMember = async () => {
    const token = await auth.getToken()
    await axios.post(`/api/v1/admin/report/${reportId}/ban-member?days=${banDays}`, null, {
      headers: { Authorization: `Bearer ${token}` },
    })
    alert("회원이 정지되고 신고가 처리되었습니다.")
    router.push("/admin/reports")
  }

  const handleIgnoreMember = async () => {
    const token = await auth.getToken()
    await axios.post(`/api/v1/admin/report/${reportId}/keep-member`, null, {
      headers: { Authorization: `Bearer ${token}` },
    })
    alert("신고를 무시하고 처리했습니다.")
    router.push("/admin/reports")
  }

  if (unauthorized) return null
  if (loading || !report) return <p className="p-4">로딩 중...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">신고 상세 정보</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{report.targetType === "FEED" ? "피드 신고" : "회원 신고"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>신고자</Label>
            <p>{report.reporterNickname}</p>
          </div>
          <div>
            <Label>신고 대상</Label>
            <p>{report.reportedNickname}</p>
          </div>
          <div>
            <Label>신고 사유</Label>
            <p>{report.reason}</p>
          </div>

          <div>
            <Label>상세 내용</Label>
            <p>{report.content}</p>
          </div>

          {report.targetType === "FEED" && (
            <div>
              <Label>피드 내용</Label>
              <Textarea disabled value={report.feedContent || "(삭제됨)"} />
              <div className="flex gap-2 mt-4">
                <Button variant="destructive" onClick={handleDeleteFeed}>
                  피드 삭제 
                </Button>
                <Button variant="secondary" onClick={handleKeepFeed}>
                  피드 유지 
                </Button>
              </div>
            </div>
          )}

          {report.targetType === "MEMBER" && (
            <div className="space-y-2">
              <Label>정지 일수</Label>
              <Input
                type="number"
                min={1}
                value={banDays}
                onChange={(e) => setBanDays(Number(e.target.value))}
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleBanMember}>
                  회원 정지 및 신고 처리
                </Button>
                <Button variant="secondary" onClick={handleIgnoreMember}>
                  제재 없이 신고 처리
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
