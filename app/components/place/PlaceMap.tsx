"use client"

import React, { useEffect, useRef, useState } from "react"
import { useKakaoMap } from "@/hooks/useKakaoMap"

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
  const { mapInstance, isMapReady, isLoading: isMapLoading } = useKakaoMap(mapRef)
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

  // 카페 데이터를 가져오는 함수
  const fetchCafeData = async () => {
    if (!specificAddressId) {
      console.log('specificAddressId가 없습니다:', specificAddressId)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // 실제 백엔드 API 엔드포인트로 변경
      const apiUrl = `http://localhost:8080/api/v1/community-place/${specificAddressId}`
      console.log('API 호출 URL:', apiUrl)
      
      const token = localStorage.getItem('auth_token')
      console.log('토큰 존재 여부:', !!token)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      console.log('API 응답 상태:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('카페 데이터 API 호출 실패:', response.status, response.statusText, errorText)
        // API 실패해도 지도는 정상 표시되도록 빈 배열로 설정
        setCafeList([])
        return
      }

      const result = await response.json()
      console.log('API 응답 데이터:', result)
      
      if (!result.success) {
        console.warn('카페 데이터 API 응답 실패:', result.error)
        // API 실패해도 지도는 정상 표시되도록 빈 배열로 설정
        setCafeList([])
        return
      }

      // API 응답 데이터를 CafeData 형식으로 변환
      const cafes: CafeData[] = result.data.map((cafe: any) => ({
        position: new window.kakao.maps.LatLng(cafe.latitude, cafe.longitude),
        name: cafe.name,
        rating: cafe.rating || 0,
        reviewCount: cafe.reviewCount || 0,
        address: cafe.address,
        phone: cafe.phone,
        hours: cafe.hours,
        description: cafe.description
      }))

      setCafeList(cafes)
    } catch (err) {
      console.error('카페 데이터 로딩 실패:', err)
      // 에러 시에도 지도는 정상 표시되도록 빈 배열로 설정
      setCafeList([])
    } finally {
      setIsLoading(false)
    }
  }

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
    // 커스텀 오버레이 생성
    const overlay = createCustomOverlay(cafe)
    overlay.setMap(null) // 초기에는 숨김
    
    // CustomOverlay로 마커 생성
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
          color: #333;
          font-weight: bold;
          line-height: 1;
          margin-bottom: 2px;
          text-align: center;
          max-width: 50px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">
          ${cafe.name}
        </div>
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
    // 마커에 데이터 저장
    customMarker.cafeData = cafe
    customMarker.overlay = overlay
    return { customMarker, overlay }
  }

  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !window.kakao || !window.kakao.maps) {
      console.log('카카오맵 준비 상태:', { 
        isMapReady, 
        mapInstance: !!mapInstance.current, 
        kakao: !!window.kakao, 
        maps: !!(window.kakao && window.kakao.maps) 
      })
      return
    }

    console.log('카카오맵 초기화 시작')

    const map = mapInstance.current

    // API에서 카페 데이터 가져오기
    if (specificAddressId) {
      fetchCafeData()
    }

    // bounds 내 카페만 visibleCafes로 관리
    const updateVisibleCafes = () => {
      const bounds = map.getBounds()
      const filtered = cafeList.filter((cafe) => {
        if (!cafe.position) return false
        return bounds.contain(cafe.position)
      })
      setVisibleCafes(filtered)
    }

    // 카페 데이터가 로드되면 visibleCafes 업데이트
    if (cafeList.length > 0) {
      updateVisibleCafes()
    }

    window.kakao.maps.event.addListener(map, 'idle', updateVisibleCafes)

    console.log('지도 생성 완료')
    console.log('지도 중심:', map.getCenter())
    console.log('지도 줌 레벨:', map.getLevel())
    console.log('지도 컨테이너:', mapRef.current)

    // 지도 로드 완료 이벤트 추가
    window.kakao.maps.event.addListener(map, 'tilesloaded', function() {
      console.log('지도 타일 로드 완료')
    })

    // 지도 클릭 이벤트 추가
    window.kakao.maps.event.addListener(map, 'click', function(mouseEvent: any) {
      console.log('지도 클릭:', mouseEvent.latLng)
    })

    // 전역 클릭 핸들러 함수 추가
    ;(window as any).handleMarkerClick = function(cafeName: string) {
      console.log('마커 클릭:', cafeName)
      
      // 해당 카페 데이터 찾기
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) return
      
      // 마커와 오버레이 매핑을 위한 임시 저장
      const markerOverlayMap = new Map()
      
      // 모든 마커에 대해 오버레이 생성 및 매핑
      cafeList.forEach((cafeData: CafeData, index: number) => {
        const overlay = createCustomOverlay(cafeData)
        overlay.setMap(null)
        markerOverlayMap.set(cafeData.name, overlay)
      })
      
      // 이전 선택된 오버레이 숨기기
      if (selectedMarkerRef.current) {
        const prevOverlay = markerOverlayMap.get(selectedMarkerRef.current.cafeData?.name)
        if (prevOverlay) {
          prevOverlay.setMap(null)
        }
      }
      
      // 현재 마커가 이미 선택된 상태라면 선택 해제
      if (selectedMarkerRef.current && selectedMarkerRef.current.cafeData?.name === cafeName) {
        selectedMarkerRef.current = null
        overlayRef.current = null
      } else {
        // 현재 마커를 선택 상태로 변경
        const currentOverlay = markerOverlayMap.get(cafeName)
        if (currentOverlay) {
          currentOverlay.setMap(map)
          selectedMarkerRef.current = { cafeData: cafe }
          overlayRef.current = currentOverlay
        }
      }

      // 마커 클릭 시 카페 선택 콜백 호출
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

  }, [isMapReady, mapInstance, mapRef, onCafeSelect, specificAddressId])

  // cafeList가 변경될 때마다 visibleCafes 업데이트
  useEffect(() => {
    if (!isMapReady || !mapInstance.current) return
    
    const map = mapInstance.current
    const bounds = map.getBounds()
    const filtered = cafeList.filter((cafe) => {
      if (!cafe.position) return false
      return bounds.contain(cafe.position)
    })
    setVisibleCafes(filtered)
  }, [cafeList, isMapReady, mapInstance])

  useEffect(() => {
    if (!isMapReady || !mapInstance.current || !window.kakao || !window.kakao.maps) return;
    const map = mapInstance.current;

    // 기존 마커/오버레이 모두 제거해야함
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

  // 로딩 상태 표시 (지도는 정상 표시하고 사이드바만 로딩 표시)
  if (isLoading) {
    return (
      <div className="flex gap-4">
        {/* 지도는 정상 표시 */}
        <div
          ref={mapRef}
          className="w-full h-[70vh] mt-16 rounded shadow border relative z-0"
          style={{ minHeight: '400px', minWidth: '300px' }}
        />
        {/* 사이드바만 로딩 표시 */}
        <div className="w-80 bg-white rounded shadow p-4 h-[70vh] overflow-y-auto mt-16 flex items-center justify-center">
          <div className="text-lg">카페 데이터를 불러오는 중...</div>
        </div>
      </div>
    )
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
      {error ? (
        <div className="text-center text-red-500 mt-8">
          <div className="text-lg mb-2">카페 데이터 로딩 실패</div>
          <div className="text-sm">{error}</div>
        </div>
      ) : sortedCafeList.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          표시할 카페가 없습니다.
        </div>
      ) : (
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
      )}
    </div>
  </div>
)
}