import { api } from "@/lib/api-client"
import { auth } from "@/lib/auth"

export interface PlaceInfo {
  name: string
  address: string
  phone?: string
  placeUrl?: string
  latitude: number
  longitude: number
}

export interface CreateStudyScheduleRequest {
    title: string
    startTime: string // ← ISO-8601 문자열 (LocalDateTime 형태)
    endTime: string
    description: string
    location?: string
    isAvailable?: boolean | null
    isImportant?: boolean
    memo?: string
    latitude?: number
    longitude?: number
    place?: PlaceInfo
  }

  export interface StudyScheduleResponseDto {
    id: number
    studyScheduleId: number
    title: string
    startTime: string
    endTime: string
    description: string
    location: string
    isAvailable?: boolean | null
    isImportant?: boolean
    memo?: string
  }

  export interface UpdateStudyScheduleRequest {
    title: string
    startTime: string
    endTime: string
    description: string
    location?: string
    isAvailable?: boolean | null
    isImportant?: boolean
    memo?: string
    latitude?: number
    longitude?: number
  }

  export interface Schedule {
    id: number
    studyScheduleId: number
    title: string
    startTime: string
    endTime: string
    description: string
    location: string
    date: string // extra field (추가됨)
    isAvailable?: "attending" | "not_attending" | null
    isImportant?: boolean
    memo?: string
  }
  
  export async function createStudySchedule(
    studyGroupId: number,
    data: CreateStudyScheduleRequest
  ): Promise<{ status: number; message: string; result: StudyScheduleResponseDto }> {
    const token = await auth.getToken()
  
    const res = await fetch(`/api/v1/study-group/${studyGroupId}/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(data),
    })
  
    if (!res.ok) {
        const errorMessage = await res.text()
        console.error("❌ 일정 등록 실패", res.status, errorMessage)
        throw new Error("일정 등록에 실패했습니다.")
    }
  
    return await res.json()
  }

  export const fetchStudySchedulesByGroup = async (
    studyGroupId: number
  ): Promise<StudyScheduleResponseDto[]> => {
    const res = await api.get(`/study-group/${studyGroupId}/schedules`)
  
    if (!res.result) {
      throw new Error("일정 목록이 비어 있습니다")
    }
  
    return res.result
  }

  export async function updateStudySchedule(
    studyGroupId: number,
    scheduleId: number,
    data: UpdateStudyScheduleRequest
  ): Promise<{ status: number; message: string; result: StudyScheduleResponseDto }> {
    const token = await auth.getToken()
  
    const res = await fetch(`/api/v1/study-group/${studyGroupId}/schedules/${scheduleId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(data),
    })
  
    if (!res.ok) {
      const errorMessage = await res.text()
      console.error("❌ 일정 수정 실패", res.status, errorMessage)
      throw new Error("일정 수정에 실패했습니다.")
    }
  
    return await res.json()
  }

  export async function deleteStudySchedule(
    studyGroupId: number,
    scheduleId: number
  ) {
    const token = await auth.getToken()
  
    const res = await fetch(`/api/v1/study-group/${studyGroupId}/schedules/${scheduleId}`, {
      method: "DELETE",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    })
  
    if (!res.ok) {
      const errorMessage = await res.text()
      console.error("❌ 일정 삭제 실패", res.status, errorMessage)
      throw new Error("일정 삭제에 실패했습니다.")
    }
  }

  // 변환 함수
export function convertToSchedule(dto: StudyScheduleResponseDto): Schedule {
  return {
    id: dto.id,  // memberStudyScheduleId 기준이라면 여기에 dto.memberStudyScheduleId
    studyScheduleId: dto.studyScheduleId,
    title: dto.title,
    startTime: dto.startTime,
    endTime: dto.endTime,
    description: dto.description,
    location: dto.location,
    date: dto.startTime.split("T")[0],
  }
  }

// 스터디 그룹 집계 조회 API
export const getStudyGroupAggregation = async (city: string, gu: string) => {
  console.log('🔗 API 호출 시작:', `/api/v1/study-group/calculate?city=${city}&gu=${gu}`)
  
  const response = await api.get('/study-group/calculate', {
    params: { city, gu }
  });
  
  console.log('🔗 API 응답:', response);
  return response;
};

// 카카오 지도 API를 사용해서 장소 상세 정보를 가져오는 함수
export async function getPlaceDetails(placeName: string, lat?: number, lng?: number): Promise<PlaceInfo | null> {
  try {
    // 카카오 지도 API가 로드되었는지 확인
    if (typeof window === 'undefined' || !window.kakao || !window.kakao.maps) {
      console.error('카카오 지도 API가 로드되지 않았습니다.')
      return null
    }

    // 카카오 지도 API의 Places 서비스 사용
    const places = new window.kakao.maps.services.Places()
    
    // 키워드로 장소 검색
    return new Promise((resolve) => {
      places.keywordSearch(placeName, (results: any[], status: any) => {
        if (status === window.kakao.maps.services.Status.OK && results.length > 0) {
          const place = results[0]
          
          console.log('카카오 지도 API 응답:', place)
          
          // 카카오맵 URL 생성
          const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.place_name)},${place.y},${place.x}`
          
          // 전화번호 정보가 있는지 확인
          let phone = undefined
          if (place.phone) {
            phone = place.phone
          } else if (place.tel) {
            phone = place.tel
          }
          
          resolve({
            name: place.place_name,
            address: place.road_address_name || place.address_name,
            phone: phone,
            placeUrl: kakaoMapUrl,
            latitude: Number(place.y),
            longitude: Number(place.x)
          })
        } else {
          console.log('검색 결과가 없습니다.')
          resolve(null)
        }
      })
    })

  } catch (error) {
    console.error('장소 정보 가져오기 실패:', error)
    return null
  }
}
  