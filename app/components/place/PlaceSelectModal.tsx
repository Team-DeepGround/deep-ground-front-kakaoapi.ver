"use client"

import React, { useRef, useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SearchInput } from "./SearchInput"
import { useKakaoMap } from "@/hooks/useKakaoMap"
import { usePlaceSearch } from "@/hooks/usePlaceSearch"
import { Button } from "@/components/ui/button"

interface PlaceSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (place: { name: string; address: string; lat: number; lng: number }) => void
}

export default function PlaceSelectModal({ open, onClose, onSelect }: PlaceSelectModalProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const { mapInstance, isMapReady, isLoading: isMapLoading } = useKakaoMap(mapRef)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const usePlaceSearchResult = usePlaceSearch(mapInstance, isMapReady, isMapLoading, setShowSuggestions, null)
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
    selectedPlace,
    handleSuggestionClick,
    handleKeyDown,
    handleUnifiedSearch,
    placeMarkers,
  } = usePlaceSearchResult

  // 마커 관리
  const markerRef = useRef<any>(null)
  useEffect(() => {
    // 1. selectedPlace가 있으면 단일 마커만 표시
    if (mapInstance.current && selectedPlace) {
      if (markerRef.current) markerRef.current.setMap(null)
      const marker = new window.kakao.maps.Marker({
        map: mapInstance.current,
        position: new window.kakao.maps.LatLng(selectedPlace.y, selectedPlace.x),
      })
      markerRef.current = marker
      mapInstance.current.setCenter(new window.kakao.maps.LatLng(selectedPlace.y, selectedPlace.x))
      return () => {
        if (markerRef.current) markerRef.current.setMap(null)
      }
    }
    // 2. placeMarkers가 있으면 모두 지도에 표시
    if (mapInstance.current && placeMarkers && placeMarkers.length > 0) {
      placeMarkers.forEach(({ marker }) => marker.setMap(mapInstance.current))
      return () => {
        placeMarkers.forEach(({ marker }) => marker.setMap(null))
      }
    }
    // 3. 아무것도 없으면 기존 마커 제거
    if (markerRef.current) markerRef.current.setMap(null)
  }, [selectedPlace, placeMarkers, mapInstance])

  // 지도 드래그 후 중심 좌표가 바뀌면 카테고리만 입력된 경우 자동 재검색
  useEffect(() => {
    if (!mapInstance.current || !isMapReady) return
    const map = mapInstance.current
    const onDragEnd = () => {
      const categories = [
        "카페",
        "스터디카페",
        "음식점",
        "편의점",
        "주차장",
        "주유소",
        "약국",
        "마트",
        "은행",
        "술집"
      ]
      if (categories.includes(searchInput.trim())) {
        handleUnifiedSearch()
      }
    }
    window.kakao.maps.event.addListener(map, "dragend", onDragEnd)
    return () => {
      window.kakao.maps.event.removeListener(map, "dragend", onDragEnd)
    }
  }, [searchInput, isMapReady, mapInstance, handleUnifiedSearch])

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const closeSuggestions = () => setShowSuggestions(false);
    window.kakao.maps.event.addListener(map, "dragstart", closeSuggestions);
    window.kakao.maps.event.addListener(map, "dragend", closeSuggestions);
    window.kakao.maps.event.addListener(map, "zoom_changed", closeSuggestions);
    return () => {
      window.kakao.maps.event.removeListener(map, "dragstart", closeSuggestions);
      window.kakao.maps.event.removeListener(map, "dragend", closeSuggestions);
      window.kakao.maps.event.removeListener(map, "zoom_changed", closeSuggestions);
    };
  }, [mapInstance, setShowSuggestions]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>장소 검색 및 선택</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[70vh]">
          {/* 단순한 카카오 지도 */}
          <div
            ref={mapRef}
            className="w-full h-full rounded-lg shadow-lg border"
            style={{ minHeight: '400px' }}
          />
          <SearchInput
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
        {selectedPlace && (
          <div className="mt-4 p-3 border rounded bg-gray-50 text-gray-800">
            <div className="font-semibold">{selectedPlace.place_name}</div>
            <div className="text-sm text-gray-600">{selectedPlace.road_address_name || selectedPlace.address_name}</div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={() => {
                  onSelect({
                    name: selectedPlace.place_name,
                    address: selectedPlace.road_address_name || selectedPlace.address_name,
                    lat: Number(selectedPlace.y),
                    lng: Number(selectedPlace.x),
                  })
                  onClose()
                }}
              >
                이 장소 선택
              </Button>
              <a
                href={`https://map.kakao.com/link/to/${encodeURIComponent(selectedPlace.place_name)},${selectedPlace.y},${selectedPlace.x}`}
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