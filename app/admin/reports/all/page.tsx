"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Report } from "@/types/report"
import { ReportList } from "@/components/admin/report-list"
import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/auth"

export default function AdminAllReportsPage() {
  const [reports, setReports] = useState<Report[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchReports = async () => {
      const token = await auth.getToken()
      const role = await auth.getRole()

      if (!token || role !== "ROLE_ADMIN") {
        setUnauthorized(true)
        router.replace("/")
        return
      }

      try {
        const response = await axios.get("/api/v1/admin/report", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        // 🔥 여기 중요: result.content로부터 꺼내야 함
        setReports(response.data.result.content)
      } catch (error) {
        console.error("전체 신고 목록 로딩 실패:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [router])

  if (unauthorized) return null

  if (loading || !reports) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">전체 신고 목록</h1>
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">전체 신고 목록</h1>
      <ReportList reports={reports} />
    </div>
  )
}
