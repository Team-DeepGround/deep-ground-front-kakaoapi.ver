import { useRouter } from "next/navigation"
import { useCallback, memo, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Users, MapPin } from "lucide-react"

export interface StudyGroup {
  id: number;
  title: string;
  description: string;
  period: string;
  recruitmentPeriod: string;
  tags: { id: number; name: string }[];
  maxMembers: number;
  currentMembers: number;
  organizer: {
    name: string;
    avatar: string;
  };
  isOnline: boolean;
  addresses: {
    city: string
    gu: string
    dong: string
  }[];
}

interface StudyCardProps {
  study: StudyGroup
}

export const StudyCard = memo(function StudyCard({ study }: StudyCardProps) {
  const router = useRouter()
  
  const handleClick = useCallback(() => {
    router.push(`/studies/${study.id}`)
  }, [study.id])

  useEffect(() => {
    console.log("📍 study.tags", study.tags)
    console.log("📍 study.addresses", study.addresses)
  }, [study])
  
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 hover:scale-[1.02] group"
      onClick={handleClick}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">{study.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0 group-hover:text-primary transition-colors" />
              <span className="truncate">{study.recruitmentPeriod}</span>
            </p>
          </div>
          <Badge variant={study.isOnline ? "default" : "outline"} className="whitespace-nowrap flex-shrink-0">
            {study.isOnline ? "온라인" : "오프라인"}
          </Badge>
        </div>
      </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 h-10">{study.description}</p>
          
          {!study.isOnline && study.addresses?.[0]?.dong && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center">
              <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0 group-hover:text-primary transition-colors" />
              <span className="truncate">{study.addresses[0].dong}</span>
            </p>
          )}


          <div className="flex flex-wrap gap-1.5 mt-3">
            {study.tags?.map((tag) => (
              <Badge key={tag.id + '-' + tag.name} variant="secondary" className="font-normal">
                {tag.name}
              </Badge>
            ))}
          </div>
        </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={study.organizer.avatar} alt={study.organizer.name} />
            <AvatarFallback>{study.organizer.name}</AvatarFallback>
          </Avatar>
          <span className="text-sm truncate">{study.organizer.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground flex items-center">
            <Users className="h-3.5 w-3.5 mr-1 flex-shrink-0 group-hover:text-primary transition-colors" />
            <span>
              {study.currentMembers}/{study.maxMembers}
            </span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}) 