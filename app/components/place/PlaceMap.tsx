"use client"

import React, { useEffect, useRef, useState } from "react"
import { useKakaoMap } from "@/hooks/useKakaoMap"
import { fetchPlacesApi } from "@/lib/api/place"
import { PlaceInfo } from "@/types/place"

interface PlaceMapProps {
  mapRef: React.RefObject<HTMLDivElement | null>
  onCafeSelect?: (cafe: any) => void
  specificAddressId?: string // API에서 필요한 파라미터 추가
}

interface CafeData {
  position: any // kakao.maps.LatLng
  name: string
  rating: number
  reviewCount: number
  address?: string
  phone?: string
  hours?: string
  description?: string
}

export function PlaceMap({ mapRef, onCafeSelect, specificAddressId }: PlaceMapProps) {
  const { mapInstance, isMapReady } = useKakaoMap(mapRef)
  const selectedMarkerRef = useRef<any>(null)
  const overlayRef = useRef<any>(null)
  const markerRefs = useRef<any[]>([])
  const overlayRefs = useRef<any[]>([])

  // 1. 카페 데이터 상태로 관리
  const [cafeList, setCafeList] = useState<CafeData[]>([])
  const [visibleCafes, setVisibleCafes] = useState<CafeData[]>([])
  const [sortBy, setSortBy] = useState<'rating' | 'reviewCount'>('rating')
  const [selectedCafeName, setSelectedCafeName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 정렬된 리스트 (visibleCafes만)
  const sortedCafeList = [...visibleCafes].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating
    if (sortBy === 'reviewCount') return b.reviewCount - a.reviewCount
    return 0
  })

  // 별점 표시 함수
  const createStarRating = (rating: number) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars)
  }

  // 커스텀 오버레이 생성 함수
  const createCustomOverlay = (cafe: CafeData) => {
    const content = `
      <div style="
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        border: 1px solid #e0e0e0;
        min-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        ">
          ${cafe.name}
        </div>
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        ">
          <div style="
            font-size: 14px;
            color: #FFD600;
            margin-right: 8px;
          ">
            ${createStarRating(cafe.rating)}
          </div>
          <div style="
            font-size: 14px;
            color: #4A90E2;
            font-weight: bold;
          ">
            ${cafe.rating}/5.0
          </div>
        </div>
        <div style="
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        ">
          리뷰 ${cafe.reviewCount}개
        </div>
        <div style="
          display: flex;
          gap: 8px;
          margin-top: 12px;
        ">
          <button style="
            background: #4A90E2;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            font-weight: bold;
          ">
            상세보기
          </button>
          <button style="
            background: #FFD600;
            color: #333;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            font-weight: bold;
          ">
            리뷰보기
          </button>
        </div>
      </div>
    `
    return new window.kakao.maps.CustomOverlay({
      content: content,
      position: cafe.position,
      xAnchor: 0.5,
      yAnchor: 0
    })
  }

  // 마커를 생성하고 지도 위에 표시하는 함수
  const addMarker = (cafe: CafeData, map: any) => {
    const overlay = createCustomOverlay(cafe)
    overlay.setMap(null)
    
    const markerHTML = `
      <div style="
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,249,250,0.9) 100%);
        border: 3px solid #FFD600;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(5px);
        pointer-events: auto;
      " onclick="window.handleMarkerClick('${cafe.name}')">
        <div style="
          font-size: 12px;
          color: #FFD600;
          line-height: 1;
          margin-bottom: 2px;
          font-weight: bold;
        ">
          ${createStarRating(cafe.rating)}
        </div>
        <div style="
          font-size: 9px;
          color: #4A90E2;
          font-weight: bold;
          line-height: 1;
          margin-bottom: 1px;
        ">
          ${cafe.rating}/5.0
        </div>
        <div style="
          font-size: 8px;
          color: #666;
          line-height: 1;
        ">
          리뷰(${cafe.reviewCount})
        </div>
      </div>
    `
    const customMarker = new window.kakao.maps.CustomOverlay({
      content: markerHTML,
      position: cafe.position,
      xAnchor: 0.5,
      yAnchor: 1.0
    })
    customMarker.setMap(map)
    customMarker.cafeData = cafe
    customMarker.overlay = overlay
    return { customMarker, overlay }
  }

  // API에서 카페 데이터 가져오기
  const fetchCafeData = async () => {
    if (!specificAddressId) {
      console.log('specificAddressId가 없습니다:', specificAddressId)
      return
    }
    
    console.log('API 데이터 로드 시작, specificAddressId:', specificAddressId)
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetchPlacesApi({
        specificAddressId,
        sortBy: 'rating',
        page: 1,
        size: 50
      })
      
      console.log('API 응답:', response)
      
      if (response.success) {
        // 데이터가 없는 경우 처리
        if (!response.result.places || response.result.places.length === 0) {
          setCafeList([])
          setError('현재 리뷰된 장소가 없습니다.')
          return
        }

        const cafeData: CafeData[] = response.result.places.map((place: PlaceInfo) => ({
          position: new window.kakao.maps.LatLng(place.locationPoint.getY(), place.locationPoint.getX()),
          name: place.name,
          rating: place.rating || 0,
          reviewCount: place.reviewCount || 0,
          address: place.location,
          phone: place.phone,
          hours: '', // API에서 제공되지 않는 경우
          description: '' // API에서 제공되지 않는 경우
        }))
        
        console.log('변환된 카페 데이터:', cafeData)
        setCafeList(cafeData)
      } else {
        console.error('API 응답 실패:', response.message)
        setError(response.message || '데이터를 불러오는데 실패했습니다.')
      }
    } catch (err) {
      console.error('카페 데이터 로드 실패:', err)
      setError('데이터를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // API 데이터 로드
  useEffect(() => {
    if (specificAddressId) {
      fetchCafeData()
    }
  }, [specificAddressId])

  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !window.kakao || !window.kakao.maps) {
      return
    }

    const map = mapInstance.current

    // bounds 내 카페만 visibleCafes로 관리
    const updateVisibleCafes = () => {
      const bounds = map.getBounds()
      const filtered = cafeList.filter((cafe) => {
        if (!cafe.position) return false
        return bounds.contain(cafe.position)
      })
      setVisibleCafes(filtered)
    }
    
    if (cafeList.length > 0) {
      updateVisibleCafes()
      window.kakao.maps.event.addListener(map, 'idle', updateVisibleCafes)
    }

    // 전역 클릭 핸들러 함수 추가
    ;(window as any).handleMarkerClick = function(cafeName: string) {
      console.log('마커 클릭:', cafeName)
      
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) return
      
      // 현재 선택된 오버레이가 있다면 닫기
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      
      // 현재 마커가 이미 선택된 상태라면 선택 해제
      if (selectedMarkerRef.current && selectedMarkerRef.current.cafeData?.name === cafeName) {
        selectedMarkerRef.current = null
        return
      }
      
      // 새로운 오버레이 생성 및 표시
      const newOverlay = createCustomOverlay(cafe)
      newOverlay.setMap(map)
      overlayRef.current = newOverlay
      selectedMarkerRef.current = { cafeData: cafe }

      if (onCafeSelect) {
        onCafeSelect(cafe)
      }
      setSelectedCafeName(cafeName)
    }

    // 지도 클릭 시 선택된 마커 초기화
    window.kakao.maps.event.addListener(map, 'click', function() {
      if (selectedMarkerRef.current) {
        const marker = selectedMarkerRef.current
        const overlay = selectedMarkerRef.current.overlay
        
        overlay.setMap(null)
        selectedMarkerRef.current = null
      }
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
    })

  }, [isMapReady, cafeList, onCafeSelect])

  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !window.kakao || !window.kakao.maps) return;
    const map = mapInstance.current;

    // 기존 마커/오버레이 모두 제거
    markerRefs.current.forEach(marker => marker.setMap(null));
    overlayRefs.current.forEach(overlay => overlay.setMap(null));
    markerRefs.current = [];
    overlayRefs.current = [];

    // visibleCafes만큼 마커/오버레이 생성
    visibleCafes.forEach((cafe: CafeData) => {
      const { customMarker, overlay } = addMarker(cafe, map);
      markerRefs.current.push(customMarker);
      overlayRefs.current.push(overlay);
    });
  }, [visibleCafes, isMapReady, mapInstance]);

  // 리스트에서 카페 클릭 시 마커 오버레이 표시
  const handleListCafeClick = (cafe: CafeData) => {
    if ((window as any).handleMarkerClick) {
      (window as any).handleMarkerClick(cafe.name)
    }
    setSelectedCafeName(cafe.name)
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">데이터를 불러오는 중...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
  }

  return (
    <div className="flex gap-4">
      {/* 지도 */}
      <div
        ref={mapRef}
        className="w-full h-[70vh] mt-16 rounded shadow border relative z-0"
        style={{ minHeight: '400px', minWidth: '300px' }}
      />
      {/* 카페 리스트 사이드바 */}
      <div className="w-80 bg-white rounded shadow p-4 h-[70vh] overflow-y-auto mt-16">
        {error ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg font-semibold mb-2">{error}</p>
            <p className="text-sm">다른 지역을 선택하거나 나중에 다시 시도해주세요.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                className={`px-3 py-1 rounded ${sortBy === 'rating' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSortBy('rating')}
              >
                별점순
              </button>
              <button
                className={`px-3 py-1 rounded ${sortBy === 'reviewCount' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSortBy('reviewCount')}
              >
                리뷰순
              </button>
            </div>
            <ul>
              {sortedCafeList.map((cafe) => (
                <li
                  key={cafe.name}
                  className={`mb-4 p-2 rounded cursor-pointer border ${
                    selectedCafeName === cafe.name ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'
                  }`}
                  onClick={() => handleListCafeClick(cafe)}
                >
                  <div className="font-bold text-lg">{cafe.name}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>⭐ {cafe.rating}</span>
                    <span className="text-gray-400">/ 리뷰 {cafe.reviewCount}개</span>
                  </div>
                  <div className="text-xs text-gray-500">{cafe.address}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}