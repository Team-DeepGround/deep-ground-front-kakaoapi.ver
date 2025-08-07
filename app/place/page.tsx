"use client"

import React, { useRef, useState } from "react"
import { usePlaceMap } from "@/hooks/useKakaoMap"
import { usePlacePageSearch } from "@/hooks/usePlaceSearch"
import { PlacePageSearchInput } from "@/app/components/place/SearchInput"
import { PlaceMap, PlaceMapRef } from "@/app/components/place/PlaceMap"

interface CafeInfo {
  id: number
  name: string
  rating: number
  reviewCount: number
  address?: string
  phone?: string
  hours?: string
  description?: string
  placeUrl?: string
  placeId?: string
  position?: any // kakao.maps.LatLng
}

export default function PlacePage() {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const placeMapRef = useRef<PlaceMapRef>(null)
  const { mapInstance, isMapReady, isLoading: isMapLoading, selectedCafe, selectCafe, searchNearbyPlaces } = usePlaceMap(mapRef)
  const {
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
    handleSuggestionClick,
    handleKeyDown,
  } = usePlacePageSearch(mapInstance, isMapReady, isMapLoading)

  const handleCafeSelect = (cafe: CafeInfo) => {
    console.log('🔍 handleCafeSelect 호출됨:', cafe)
    console.log('🔍 cafe.placeId:', cafe.placeId)
    selectCafe(cafe)
  }

  const handleReviewClick = () => {
    if (selectedCafe && placeMapRef.current) {
      // CafeInfo를 CafeData 형태로 변환
      const cafeData = {
        position: null, // 지도에서 선택된 카페이므로 position은 필요없음
        name: selectedCafe.name,
        rating: selectedCafe.rating,
        reviewCount: selectedCafe.reviewCount,
        address: selectedCafe.address,
        phone: selectedCafe.phone,
        hours: selectedCafe.hours,
        description: selectedCafe.description,
        placeUrl: selectedCafe.placeUrl,
        id: selectedCafe.id || 0 // 실제 ID 사용, 없으면 0
      }
      placeMapRef.current.handleReviewClick(cafeData)
    }
  }

  // 별점순으로 모임장소 조회 (API에서 자동으로 처리됨)

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <h1 className="text-3xl font-bold mb-4">모임장소</h1>
      <div className="flex gap-6">
        {/* 왼쪽: 지도 영역 */}
        <div className="flex-1">
          <PlacePageSearchInput
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
          {/* 모임장소용 고급 지도 컨테이너 */}
          <div className="w-full h-[70vh] mt-16 rounded shadow border relative">
            <div
              ref={mapRef}
              id="kakao-map-container"
              className="w-full h-full"
              style={{ 
                minHeight: '400px', 
                minWidth: '300px',
                zIndex: 1,
                position: 'relative',
                overflow: 'visible'
              }}
            />
          </div>
        </div>
        
        {/* 오른쪽: 카페 리스트 사이드바 */}
        <PlaceMap 
          mapRef={mapRef} 
          mapInstance={mapInstance}
          onCafeSelect={handleCafeSelect}
          ref={placeMapRef}
        />
        
        {/* 오른쪽: 상세 정보 패널 */}
        <div className="w-80 bg-white rounded-lg shadow-lg p-6 h-[70vh] overflow-y-auto">
          {selectedCafe ? (
            <div>
              <h2 className="text-xl font-bold mb-4">{selectedCafe.name}</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="text-yellow-400 text-lg">
                    {'★'.repeat(Math.floor(selectedCafe.rating))}
                    {'☆'.repeat(5 - Math.floor(selectedCafe.rating))}
                  </div>
                  <span className="text-blue-600 font-bold">{selectedCafe.rating}/5.0</span>
                </div>
                <div className="text-gray-600 text-sm">
                  리뷰 {selectedCafe.reviewCount}개
                </div>
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-700">
                    <div className="mb-2">
                      <span className="font-semibold">주소:</span> {selectedCafe.address}
                    </div>
                    {selectedCafe.phone && (
                      <div className="mb-2">
                        <span className="font-semibold">전화:</span> {selectedCafe.phone}
                      </div>
                    )}
                    {selectedCafe.hours && (
                      <div className="mb-2">
                        <span className="font-semibold">영업시간:</span> {selectedCafe.hours}
                      </div>
                    )}
                    {selectedCafe.description && (
                      <div className="mb-2">
                        <span className="font-semibold">설명:</span> {selectedCafe.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <button 
                    className="bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      console.log('🔍 오른쪽 패널 상세보기 버튼 클릭됨')
                      console.log('🔍 selectedCafe:', selectedCafe)
                      console.log('🔍 selectedCafe.placeId:', selectedCafe.placeId)
                      
                      if (selectedCafe.placeId && selectedCafe.placeId.trim() !== '') {
                        // 카카오맵 외부 링크로 이동
                        const kakaoMapUrl = `https://place.map.kakao.com/${selectedCafe.placeId}`
                        console.log('✅ 카카오맵 외부 링크로 이동:', kakaoMapUrl)
                        window.open(kakaoMapUrl, '_blank')
                      } else {
                        console.log('❌ placeId가 없음, 카카오맵 검색 API 사용')
                        // placeId가 없으면 카카오맵 검색 API를 사용해서 place_url 찾기
                        if (placeMapRef.current) {
                          // PlaceMap의 searchKakaoPlaceUrl 함수를 사용
                          const searchAndOpen = async () => {
                            try {
                              const placeUrl = await placeMapRef.current?.searchKakaoPlaceUrl(selectedCafe.name, selectedCafe.address || '')
                              if (placeUrl) {
                                console.log('✅ 카카오맵 검색으로 place_url 찾음:', placeUrl)
                                window.open(placeUrl, '_blank')
                              } else {
                                alert('해당 매장의 상세 정보를 찾을 수 없습니다.')
                              }
                            } catch (error) {
                              console.error('❌ 카카오맵 검색 실패:', error)
                              alert('해당 매장의 상세 정보를 찾을 수 없습니다.')
                            }
                          }
                          searchAndOpen()
                        } else {
                          alert('해당 매장의 상세 정보가 없습니다.')
                        }
                      }
                    }}
                  >
                    상세보기
                  </button>
                  <button className="bg-yellow-400 text-gray-800 px-4 py-2 rounded text-sm font-semibold hover:bg-yellow-500 transition-colors" onClick={handleReviewClick}>
                    리뷰보기
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              <div className="text-4xl mb-4">📍</div>
              <p className="text-lg font-semibold mb-2">카페를 선택해주세요</p>
              <p className="text-sm">지도에서 마커를 클릭하면 상세 정보를 볼 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
