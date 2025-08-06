"use client"

import React, { useRef, useEffect, useState, useCallback } from "react"
import { useKakaoMap } from "@/hooks/useKakaoMap"
import { useStudyMap } from "@/hooks/useStudyMap"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Search, Loader2 } from "lucide-react"
import { StudyCard } from "./StudyCard"
import { api } from "@/lib/api-client" // 추가

interface StudyMapProps {
  onClose: () => void
}

export function StudyMap({ onClose }: StudyMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const { mapInstance, isMapReady } = useKakaoMap(mapRef)
  const {
    studyMarkers,
    isLoading,
    currentLocation,
    searchInput,
    setSearchInput,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    highlighted,
    setHighlighted,
    isComposing,
    setIsComposing,
    inputError,
    setInputError,
    getCurrentLocation,
    handleSearch,
    handleSuggestionClick,
    handleKeyDown,
    updateStudyMarkers,
    testUpdateMarkers
  } = useStudyMap(mapInstance, isMapReady)

  interface MarkerLocation {
    city: string
    gu: string
    dong: string
  }

  // 마커 클릭 시 리스트 상태 추가
  const [selectedMarker, setSelectedMarker] = useState<any>(null)
  const [markerStudies, setMarkerStudies] = useState<any[]>([])
  const [isListLoading, setIsListLoading] = useState(false)

  // 마커 클릭 핸들러
  const handleMarkerClick = useCallback(async (marker: MarkerLocation) => {
    console.log('마커 클릭:', marker); // 추가
    setSelectedMarker(marker)
    setIsListLoading(true)
    try {
      // 예시: marker.lat, marker.lng로 API 호출
      const res = await api.get('/study-group/list', {
        params: {
          city: marker.city,
          gu: marker.gu,
          dong: marker.dong,
        }
      })
      setMarkerStudies(res.result.studyGroups)
    } catch (e) {
      console.error('스터디 그룹 목록 조회 실패:', e)
      setMarkerStudies([])
    } finally {
      setIsListLoading(false)
    }
  }, [])

  useEffect(() => {
    window.onStudyMapMarkerClick = handleMarkerClick
    return () => {
      window.onStudyMapMarkerClick = undefined
    }
  }, [handleMarkerClick])

  // 지도 준비 후 현재 위치 이동
  useEffect(() => {
    if (isMapReady) {
      console.log('🗺️ 지도 준비 완료, 초기화 시작')
      getCurrentLocation()
    }
  }, [isMapReady, getCurrentLocation])

  // 마커 렌더링 및 클릭 이벤트 연결 예시 (실제 마커 생성 로직에 따라 조정 필요)
  useEffect(() => {
  if (!mapInstance || !isMapReady) return
  studyMarkers.forEach(marker => {
    if (marker.kakaoMarker) {
      console.log('마커에 이벤트 연결:', marker)
      window.kakao.maps.event.addListener(marker.kakaoMarker, 'click', () => handleMarkerClick(marker))
    } else {
      console.log('kakaoMarker 없음:', marker)
    }
  })
  // eslint-disable-next-line
}, [mapInstance, isMapReady, studyMarkers])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-row">
        {/* 좌측: 지도 및 검색 */}
        <div className="flex-1 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-bold">지도에서 스터디 찾기</h2>
              <p className="text-sm text-gray-600 mt-1">
                지도를 드래그하여 해당 지역의 스터디 그룹을 확인하세요
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>

          {/* 검색바 */}
          <div className="p-4 border-b">
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="지역명을 입력하세요 (예: 강남구, 홍대)"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value)
                      setShowSuggestions(true)
                      setHighlighted(-1)
                      setInputError("")
                    }}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(e) => {
                      setIsComposing(false)
                      setSearchInput(e.currentTarget.value)
                    }}
                    className="pl-10"
                  />
                  
                  {/* 자동완성 드롭다운 */}
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
                      {suggestions.map((suggestion, index) => (
                        <li
                          key={suggestion.id || `${suggestion.place_name}-${index}`}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                            highlighted === index ? "bg-gray-100" : ""
                          }`}
                          onMouseDown={() => handleSuggestionClick(suggestion)}
                          onMouseEnter={() => setHighlighted(index)}
                        >
                          <div className="font-medium">{suggestion.place_name}</div>
                          {suggestion.road_address_name && (
                            <div className="text-sm text-gray-500">
                              {suggestion.road_address_name}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button onClick={() => handleSearch()} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "검색"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={isLoading}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  현재 위치
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🔘 수동 마커 업데이트 버튼 클릭')
                    updateStudyMarkers()
                  }}
                  disabled={isLoading}
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  마커 새로고침
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🧪 테스트 버튼 클릭')
                    testUpdateMarkers()
                  }}
                  disabled={isLoading}
                >
                  🧪 테스트
                </Button>
              </div>
              {inputError && (
                <div className="text-red-500 text-sm mt-2">{inputError}</div>
              )}
            </div>
          </div>

          {/* 지도 컨테이너 */}
          <div className="flex-1 relative">
            <div
              ref={mapRef}
              className="w-full h-full rounded-b-lg"
            />
            
            {/* 로딩 오버레이 */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>스터디 그룹 정보를 불러오는 중...</span>
                </div>
              </div>
            )}

            {/* 현재 위치 표시 */}
            {currentLocation && (
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
                <div className="text-sm font-medium">현재 위치</div>
                <div className="text-xs text-gray-600">
                  위도: {currentLocation.lat.toFixed(4)}
                </div>
                <div className="text-xs text-gray-600">
                  경도: {currentLocation.lng.toFixed(4)}
                </div>
              </div>
            )}

            {/* 마커 정보 */}
            {studyMarkers.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                <div className="text-sm font-medium mb-2">스터디 그룹 현황</div>
                <div className="text-xs text-gray-600">
                  총 {studyMarkers.length}개 지역에서 스터디 그룹이 발견되었습니다.
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  마커를 클릭하여 상세 정보를 확인하세요.
                </div>
              </div>
            )}
          </div>
        </div>
        {/* 우측: 마커 관련 리스트 */}
        <div className="w-96 p-4 overflow-y-auto">
          <h3 className="font-bold text-lg mb-2">이 지역 스터디 그룹</h3>
          {selectedMarker && (
            <p className="text-sm text-gray-600 mb-3">
              {selectedMarker.city} {selectedMarker.gu} {selectedMarker.dong}
            </p>
          )}
          {isListLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          ) : Array.isArray(markerStudies) && markerStudies.length > 0 ? (
            <ul className="space-y-3">
              {markerStudies.map((study) => (
                <li key={study.id}>
                  <StudyCard study={study} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-400">이 지역에 스터디 그룹이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}
