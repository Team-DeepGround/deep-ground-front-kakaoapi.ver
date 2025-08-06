export interface Reply {
  replyId: number
  nickname: string
  content: string
  createdAt: string
}

export interface Comment {
  commentId: number
  nickname: string
  content: string
  createdAt: string
  replies: Reply[]
}

export interface Participant {
  memberId: number
  profileId: number
  nickname: string
}

export interface AddressDto {
  id: number
  city: string
  gu: string
  dong: string
}

export interface StudySession {
  id: number
  title: string
  description: string
  startDate: string
  endDate: string
  location: string
  participants: string[]
}

export interface StudyGroupDetail {
  id: number
  title: string
  explanation: string
  writer: string
  memberCount: number
  groupLimit: number
  recruitStartDate: string
  recruitEndDate: string
  studyStartDate: string
  studyEndDate: string
  commentCount: number
  participants: Participant[]
  comments: Comment[]
  offline: boolean
  sessions: StudySession[]
  memberStatus: "NOT_APPLIED" | "PENDING" | "APPROVED"
  addresses: AddressDto[] // ✅ 새로 추가된 필드
}
