import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ExternalLink, MapPin, Settings, Users } from "lucide-react"
import Link from "next/link"
import { StudyGroupDetail } from "@/types/study"

interface StudyHeaderProps {
  study: StudyGroupDetail
}

export function StudyHeader({ study }: StudyHeaderProps) {
  const locationText = study.offline && study.addresses?.length
    ? `${study.addresses[0].city} ${study.addresses[0].gu} ${study.addresses[0].dong}`
    : "온라인"

  return (
    <div className="mb-8 w-full">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={study.offline ? "outline" : "default"}>
              {study.offline ? "오프라인" : "온라인"}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">{study.title}</h1>
          <p className="text-muted-foreground mt-2 whitespace-pre-line">
            {study.explanation}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" asChild>
            <Link href={`/studies/${study.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              공개 페이지 보기
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/studies/edit/${study.id}`}>
              <Settings className="mr-2 h-4 w-4" />
              스터디 설정
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mt-6">
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
          <span>{locationText}</span>
        </div>
      </div>
    </div>
  )
}
