"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent,  DialogDescription,  DialogFooter,  DialogHeader,  DialogTitle,  DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, FileText, MapPin, Settings, Trash2 } from "lucide-react"
import { createStudySchedule, fetchStudySchedulesByGroup, updateStudySchedule, deleteStudySchedule, getPlaceDetails, PlaceInfo } from "@/lib/api/studySchedule"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import TimePicker from "./TimePicker"
import ScheduleDetailModal from "./ScheduleDetailModal"
import ScheduleEditModal from "./ScheduleEditModal"
import PlaceSelectModal from "@/app/components/place/PlaceSelectModal"
import ReviewModal from "../../../../components/studies/manage/studySchedule/ReviewModal"

interface Schedule {
  id: number
  studyScheduleId: number
  title: string
  date: string
  startTime: Date
  endTime: Date
  location: string
  description: string
  attendance?: "attending" | "not_attending" | null
  isImportant?: boolean
  personalNote?: string
}

export function StudySchedule() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTargetSchedule, setReviewTargetSchedule] = useState<Schedule | null>(null)
  const params = useParams()

  // 새 일정 추가용 상태
  const [newSchedule, setNewSchedule] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    lat: "",
    lng: "",
    place: null as PlaceInfo | null,
  })

  // 수정용 상태
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [pendingLocation, setPendingLocation] = useState("")

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const studyGroupId = Number(params.id)
        const data = await fetchStudySchedulesByGroup(studyGroupId) 
        const mappedSchedules = data.map((item: any) => {
          const startDate = new Date(item.startTime)
          const endDate = new Date(item.endTime)
        
          let attendance: "attending" | "not_attending" | null

          if (item.isAvailable === true) {
            attendance = "attending"
          } else if (item.isAvailable === false) {
            attendance = "not_attending"
          } else {
            attendance = null
          }

          return {
            id: item.id,
            studyScheduleId: item.id,
            title: item.title,
            date: item.startTime.split("T")[0],           // date도 그냥 Date 객체로 통일
            startTime: startDate,
            endTime: endDate,
            location: item.location,
            description: item.description,
            attendance,
            personalNote: item.memo ?? "",
            isImportant: item.isImportant ?? false,
            lat: item.latitude, // 추가
            lng: item.longitude, // 추가
          }
        }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) 
  
        setSchedules(mappedSchedules)
      } catch (error) {
        console.error("일정 조회 실패:", error)
      }
    }
  
    loadSchedules()
  }, [params.id])

  const isOverlapping = (startA: Date, endA: Date, startB: Date, endB: Date) => {
    return startA < endB && startB < endA
  }

  const handleAddSchedule = async () => {
    const startTime = `${newSchedule.date}T${newSchedule.startTime}:00`
    const endTime = `${newSchedule.date}T${newSchedule.endTime}:00`
    const startDateTime = new Date(startTime)
    const endDateTime = new Date(endTime)
    const studyGroupId = Number(params.id)
    const isConflict = schedules.some(schedule =>
    isOverlapping(startDateTime, endDateTime, schedule.startTime, schedule.endTime)
  )

  if (isConflict) {
    alert("다른 일정과 시간이 겹칩니다.")
    return
  }

  if (!newSchedule.title.trim()) {
    alert("제목을 입력해주세요.")
    return
  }

  if (!newSchedule.startTime || !newSchedule.endTime) {
    alert("일정 시간을 입력해주세요.")
    return
  }

  if (newSchedule.endTime <= newSchedule.startTime) {
    alert("종료 시간은 시작 시간보다 늦어야 합니다")
    return
   }

  if (!newSchedule.description.trim()) {
    alert("설명을 입력해주세요.")
    return
  }
  
    try {
      const res = await createStudySchedule(studyGroupId, {
        title: newSchedule.title,
        startTime,
        endTime,
        description: newSchedule.description,
        location: newSchedule.location,
        latitude: newSchedule.lat ? Number(newSchedule.lat) : undefined,
        longitude: newSchedule.lng ? Number(newSchedule.lng) : undefined,
        place: newSchedule.place || undefined,
      })
      const fetched = await fetchStudySchedulesByGroup(studyGroupId)

      setSchedules(
        fetched.map((s) => ({
          id: s.id,
          studyScheduleId: s.studyScheduleId,
          title: s.title,
          date: s.startTime.split("T")[0],
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
          location: s.location,
          description: s.description,
        }))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      )

      setNewSchedule({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        description: "",
        lat: "",
        lng: "",
        place: null,
      })
      setIsAddModalOpen(false)
      window.location.reload(); // 새로고침
    } catch (error) {
      console.error("일정 생성 실패:", error)
    }
  }

  const handleEditSchedule = async () => {
    if (!editSchedule) return
    const studyGroupId = Number(params.id)
    if (!editSchedule || !editSchedule.studyScheduleId) {
      console.error("studyScheduleId 값이 비정상입니다.", editSchedule)
      return
    }
    
    const scheduleId = Number(editSchedule.studyScheduleId)
    
    if (isNaN(scheduleId)) {
      console.error("scheduleId 변환 결과가 NaN입니다.", editSchedule.studyScheduleId)
      return
    }
  
    const startTime = format(editSchedule.startTime, "yyyy-MM-dd'T'HH:mm:ss")
    const endTime = format(editSchedule.endTime, "yyyy-MM-dd'T'HH:mm:ss")
    const startDateTime = new Date(startTime)
    const endDateTime = new Date(endTime)

    if (!editSchedule.title.trim()) {
      alert("제목을 입력해주세요.")
      return
    }

    if (!editSchedule.description.trim()) {
      alert("설명을 입력해주세요.")
      return
    }

    if (editSchedule.endTime <= editSchedule.startTime) {
      alert("종료 시간은 시작 시간보다 늦어야 합니다")
      return
    }

  const isConflict = schedules.some(schedule =>
    schedule.studyScheduleId !== scheduleId && // 본인 일정 제외
    isOverlapping(startDateTime, endDateTime, schedule.startTime, schedule.endTime)
  )

  if (isConflict) {
    alert("다른 일정과 시간이 겹칩니다.")
    return
  }
  
    try {
      const res = await updateStudySchedule(studyGroupId, scheduleId, {
        title: editSchedule.title,
        startTime,
        endTime,
        description: editSchedule.description,
        location: editSchedule.location,
        isAvailable: editSchedule.attendance === "attending" ? true :
                    editSchedule.attendance === "not_attending" ? false : null,
        isImportant: editSchedule.isImportant ?? false,
        memo: editSchedule.personalNote ?? "",
      })
  
      const updated = res.result // ✅ result 꺼내서 사용

      setSchedules((prev) =>
        prev
          .map((s) =>
            s.studyScheduleId === scheduleId
              ? {
                  ...s,
                  title: updated.title,
                  date: updated.startTime.split("T")[0],
                  startTime: new Date(updated.startTime),
                  endTime: new Date(updated.endTime),
                  location: updated.location,
                  description: updated.description,
                }
              : s
          )
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      )
  
      setIsEditModalOpen(false)
      setEditSchedule(null)
    } catch (error) {
      console.error("일정 수정 실패:", error)
    }
  }

  const openDetailModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setIsDetailModalOpen(true)
  }

  const openEditModal = (schedule: Schedule) => {
  
    setEditSchedule({
      ...schedule,
      date: schedule.startTime.toISOString().split("T")[0],
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!params.id) return

    const isConfirmed = window.confirm("일정을 삭제하시겠습니까?")
    if (!isConfirmed) return
  
    try {
      const studyGroupId = Number(params.id)
      await deleteStudySchedule(studyGroupId, scheduleId)
      alert("일정이 삭제되었습니다.")
  
      const updated = await fetchStudySchedulesByGroup(studyGroupId)
      const formatted = updated.map((item) => {
        const date = new Date(item.startTime)   // string -> Date
        const startTime = new Date(item.startTime)
        const endTime = new Date(item.endTime)

        let attendance: "attending" | "not_attending" | null
        if (item.isAvailable === true) {
          attendance = "attending"
        } else if (item.isAvailable === false) {
          attendance = "not_attending"
        } else {
          attendance = null
        }
  
        return {
          id: item.id,
          studyScheduleId: item.id,
          title: item.title,
          date: item.startTime.split("T")[0], 
          startTime,
          endTime,
          location: item.location,
          description: item.description,
          attendance,
          personalNote: item.memo ?? "",
          isImportant: item.isImportant ?? false,
        }
      })
      setSchedules(
        formatted.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      )
  
    } catch (error) {
      console.error("❌ 일정 삭제 실패:", error)
      alert("❌ 일정 삭제에 실패했습니다.")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>일정 관리</CardTitle>
          <CardDescription>스터디 일정을 관리하세요</CardDescription>
        </div>

        {/* 일정 추가 모달 */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              일정 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>새 일정 추가</DialogTitle>
              <DialogDescription>새로운 스터디 일정을 추가하세요.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  제목
                </Label>
                <Input
                  id="title"
                  placeholder="제목은 필수입니다"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                  날짜
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">시작 시간</Label>
                <div className="col-span-3">
                  <TimePicker
                    value={newSchedule.startTime}
                    onChange={(time) => setNewSchedule({ ...newSchedule, startTime: time })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">종료 시간</Label>
                <div className="col-span-3">
                  <TimePicker
                    value={newSchedule.endTime}
                    onChange={(time) => setNewSchedule({ ...newSchedule, endTime: time })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  장소
                </Label>
                <div className="col-span-3 flex gap-2 items-center">
                  <Input
                    id="location"
                    value={newSchedule.location}
                    onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPlaceModal(true)}>
                    장소 검색
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  설명
                </Label>
                <Textarea
                  id="description"
                  placeholder="설명은 필수입니다"
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddSchedule}>
                추가하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{schedule.title}</h3>
                  <Badge variant="outline">
                  {format(schedule.date, "yyyy-MM-dd")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{schedule.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {schedule.location}
                    <Button variant="ghost" size="sm" className="ml-2 px-2 py-1 text-xs" onClick={() => { setReviewTargetSchedule(schedule); setReviewModalOpen(true); }}>
                      리뷰달기
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openDetailModal(schedule)}>
                  <FileText className="mr-2 h-4 w-4" />
                  상세보기
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditModal(schedule)}>
                  <Settings className="mr-2 h-4 w-4" />
                  수정
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteSchedule(schedule.id)}
                >
                <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* 상세보기 모달 */}
      <ScheduleDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        schedule={selectedSchedule}
      />

      {/* 수정 모달 */}
      <ScheduleEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        schedule={editSchedule}
        setSchedule={setEditSchedule}
        onSubmit={handleEditSchedule}
      />
      {showPlaceModal && (
        <PlaceSelectModal
          open={showPlaceModal}
          onClose={() => setShowPlaceModal(false)}
          onSelect={async (place) => {
            // 카카오 API를 사용해서 장소 상세 정보 가져오기
            const placeDetails = await getPlaceDetails(place.name)
            
            setNewSchedule((prev) => ({
              ...prev,
              location: place.address || place.name,
              lat: String(place.lat),
              lng: String(place.lng),
              place: placeDetails || {
                name: place.name,
                address: place.address,
                latitude: place.lat,
                longitude: place.lng,
              },
            }))
            setShowPlaceModal(false)
          }}
        />
      )}
      <ReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        schedule={reviewTargetSchedule}
      />
    </Card> 
  )
}

export default function Component() {
  return (
    <div className="p-6">
      <StudySchedule />
    </div>
  )
}
