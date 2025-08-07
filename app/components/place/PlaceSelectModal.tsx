"use client"

import React, { useRef, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScheduleSearchInput } from "./SearchInput"
import { useScheduleMap } from "@/hooks/useKakaoMap"
import { useSchedulePlaceSearch } from "@/hooks/usePlaceSearch"
import { Button } from "@/components/ui/button"

interface PlaceSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (place: { name: string; address: string; lat: number; lng: number }) => void
}

export default function PlaceSelectModal({ open, onClose, onSelect }: PlaceSelectModalProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const { mapInstance, isMapReady, isLoading: isMapLoading, selectedPlace, showSelectedPlace } = useScheduleMap(mapRef)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const usePlaceSearchResult = useSchedulePlaceSearch(mapInstance, isMapReady, isMapLoading)
  const {
    searchInput,
    setSearchInput,
    suggestions,
    highlighted,
    setHighlighted,
    isComposing,
    setIsComposing,
    inputError,
    setInputError,
    selectedPlace: searchSelectedPlace,
    handleSuggestionClick,
    handleKeyDown,
    handleUnifiedSearch,
    placeMarkers,
    selectedSchedulePlace,
    handleSchedulePlaceSelect,
  } = usePlaceSearchResult

  // 마커 관리 (스터디 일정 추가용으로 단순화)
  const markerRef = useRef<any>(null)
  useEffect(() => {
    // 선택된 장소가 있으면 단일 마커만 표시
    if (mapInstance.current && searchSelectedPlace) {
      if (markerRef.current) markerRef.current.setMap(null)
      const marker = new window.kakao.maps.Marker({
        map: mapInstance.current,
        position: new window.kakao.maps.LatLng(searchSelectedPlace.y, searchSelectedPlace.x),
      })
      markerRef.current = marker
      mapInstance.current.setCenter(new window.kakao.maps.LatLng(searchSelectedPlace.y, searchSelectedPlace.x))
      
      // 선택된 장소 정보 업데이트
      showSelectedPlace(searchSelectedPlace)
      
      return () => {
        if (markerRef.current) markerRef.current.setMap(null)
      }
    }
    // 아무것도 없으면 기존 마커 제거
    if (markerRef.current) markerRef.current.setMap(null)
  }, [searchSelectedPlace, mapInstance, showSelectedPlace])

  // 모달이 열릴 때 지도 컨테이너 강제 생성
  useEffect(() => {
    if (open) {
      console.log('🗺️ 스터디 일정 추가 - 모달 열림')
      
      // 모달이 열린 후 지도 컨테이너 초기화
      const timer = setTimeout(() => {
        // ref가 준비될 때까지 기다림
        let checkCount = 0
        const checkRef = () => {
          if (mapRef.current) {
            console.log('🗺️ mapRef.current가 준비됨')
            
            // 컨테이너가 존재하는지 확인
            if (!mapRef.current) {
              console.error('🗺️ mapRef.current가 null입니다')
              return
            }

            // 컨테이너 크기를 명시적으로 설정
            const container = mapRef.current
            container.style.width = '100%'
            container.style.height = '100%'
            container.style.minHeight = '400px'
            container.style.minWidth = '300px'
            container.style.display = 'block'
            container.style.position = 'relative'
            container.style.zIndex = '1'
            
            console.log('🗺️ 지도 컨테이너 크기 설정 완료:', {
              width: container.offsetWidth,
              height: container.offsetHeight,
              style: container.style.cssText
            })
            
            // 지도가 준비되면 relayout 실행
            if (isMapReady && mapInstance.current) {
              setTimeout(() => {
                try {
                  mapInstance.current.relayout()
                  console.log('🗺️ 스터디 일정 추가 - 지도 relayout 완료')
                } catch (error) {
                  console.error('🗺️ 스터디 일정 추가 - 지도 relayout 실패:', error)
                }
              }, 100)
            }
          } else {
            checkCount++
            if (checkCount < 50) { // 최대 5초 대기
              setTimeout(checkRef, 100)
            } else {
              console.log('🗺️ mapRef.current가 준비되지 않음 - 타임아웃')
            }
          }
        }
        
        checkRef()
      }, 200) // 모달 애니메이션 완료 후 실행

      return () => clearTimeout(timer)
    }
  }, [open, isMapReady, mapInstance])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>스터디 일정 장소 선택</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[70vh]">
          {/* 스터디 일정 추가용 간단한 카카오 지도 */}
          <div
            ref={mapRef}
            className="w-full h-full rounded-lg shadow-lg border"
            style={{ 
              minHeight: '400px',
              minWidth: '300px',
              position: 'relative',
              zIndex: 1,
              display: 'block',
              width: '100%',
              height: '100%'
            }}
          />
          <ScheduleSearchInput
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            isMapReady={isMapReady}
            isMapLoading={isMapLoading}
            handleKeyDown={handleKeyDown}
            setIsComposing={setIsComposing}
            setShowSuggestions={setShowSuggestions}
            setHighlighted={setHighlighted}
            setInputError={setInputError}
            showSuggestions={showSuggestions}
            suggestions={suggestions}
            highlighted={highlighted}
            handleSuggestionClick={handleSuggestionClick}
            inputError={inputError}
          />
        </div>
        {searchSelectedPlace && (
          <div className="mt-4 p-3 border rounded bg-gray-50 text-gray-800">
            <div className="font-semibold">{searchSelectedPlace.place_name}</div>
            <div className="text-sm text-gray-600">{searchSelectedPlace.road_address_name || searchSelectedPlace.address_name}</div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => {
                  onSelect({
                    name: searchSelectedPlace.place_name,
                    address: searchSelectedPlace.road_address_name || searchSelectedPlace.address_name,
                    lat: Number(searchSelectedPlace.y),
                    lng: Number(searchSelectedPlace.x),
                  })
                  onClose()
                }}
              >
                이 장소로 일정 추가
              </Button>
              <a
                href={`https://map.kakao.com/link/to/${encodeURIComponent(searchSelectedPlace.place_name)},${searchSelectedPlace.y},${searchSelectedPlace.x}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline">길찾기(카카오맵)</Button>
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 