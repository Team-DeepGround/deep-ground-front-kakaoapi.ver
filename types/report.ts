// types/report.ts
export interface Report {
  id: number
  targetType: "FEED" | "MEMBER"
  targetId: number
  reason: "SPAM" | "SEXUAL_CONTENT" | "ABUSE" | "OTHER"
  content: string
  isAutoBanned: boolean
  aiReviewResult: "ACCEPTED" | "REJECTED" | "PENDING"
  createdAt: string
  processed: boolean             // ✅ 이 줄을 추가
  actionTaken?: string | null   // 선택적으로 표시할 경우
}

export interface ReportDetail {
    id: number
    targetType: "FEED" | "MEMBER"
    reason: "SPAM" | "SEXUAL_CONTENT" | "ABUSE" | "OTHER"
    content: string
    isAutoBanned: boolean
    aiReviewResult: "ACCEPTED" | "REJECTED" | "PENDING"
    createdAt: string
    reporterId: number
    reporterNickname: string
    reportedMemberId?: number
    reportedNickname?: string
    feedId?: number
    feedContent?: string
}
