// components/admin/report-list.tsx
"use client"

import Link from "next/link"
import { Report } from "@/types/report"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface ReportListProps {
  reports: Report[]
  title?: string
}

export function ReportList({ reports, title }: ReportListProps) {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">신고가 없습니다.</p>
      ) : (
        reports.map((report) => {
            const isAutoProcessed =
                report.aiReviewResult === "ACCEPTED" || report.aiReviewResult === "REJECTED"

            const badgeColor = isAutoProcessed ? "destructive" : "default"
            const badgeText = isAutoProcessed ? "자동 제재" : "수동 검토"
            
            const cardContent = (
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">
                    🚨 [{report.targetType}] ID: {report.targetId}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                    <Badge variant="outline">{report.reason}</Badge>
                    <Badge variant={badgeColor}>{badgeText}</Badge>
                    <Badge
                        variant={
                        report.aiReviewResult === "ACCEPTED"
                            ? "destructive"
                            : report.aiReviewResult === "REJECTED"
                            ? "secondary"
                            : "outline"
                        }
                    >
                        {report.aiReviewResult}
                    </Badge>
                    </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                    <p>
                    <span className="font-semibold">내용:</span> {report.content}
                    </p>
                    <p className="text-muted-foreground text-xs">
                    생성일: {format(new Date(report.createdAt), "yyyy-MM-dd HH:mm")}
                    </p>
                </CardContent>
                </Card>
            )

            const disableLink = isAutoProcessed

            return disableLink ? (
                <div key={report.id}>{cardContent}</div>
            ) : (
                <Link key={report.id} href={`/admin/reports/${report.id}`}>
                {cardContent}
                </Link>
            )
            })

      )}
    </div>
  )
}
