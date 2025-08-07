// app/admin/reports/page.tsx
"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { Report } from "@/types/report"
import { ReportList } from "@/components/admin/report-list"
import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/auth"

export default function AdminPendingReportsPage() {
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
        router.replace("/") // 비관리자 접근 차단
        return
      }

      try {
        const response = await axios.get("/api/v1/admin/report/pending", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setReports(response.data.result)
      } catch (error) {
        console.error("신고 목록을 불러오는 데 실패했습니다.", error)
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
        <h1 className="text-2xl font-bold">검토가 필요한 신고 목록</h1>
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">검토가 필요한 신고 목록</h1>
      <ReportList reports={reports.filter((r) => !r.processed)} />
    </div>
  )
}
