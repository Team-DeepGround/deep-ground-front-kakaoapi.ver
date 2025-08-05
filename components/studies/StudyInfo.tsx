import { Calendar, Users, MapPin } from "lucide-react"
import { StudyGroupDetail } from "@/types/study"

interface StudyInfoProps {
  study: StudyGroupDetail
}

export function StudyInfo({ study }: StudyInfoProps) {
  // 가장 첫 번째 주소만 표시 (예: 서울특별시 강남구 역삼동)
  const address =
    study.offline && study.addresses?.length
      ? `${study.addresses[0].city} ${study.addresses[0].gu} ${study.addresses[0].dong}`
      : "온라인"

  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span>
          모집 기간: {new Date(study.recruitStartDate).toLocaleDateString()} ~{" "}
          {new Date(study.recruitEndDate).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span>
          스터디 기간: {new Date(study.studyStartDate).toLocaleDateString()} ~{" "}
          {new Date(study.studyEndDate).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <span>
          {study.memberCount}/{study.groupLimit}명
        </span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <span>{address}</span>
      </div>
    </div>
  )
}
