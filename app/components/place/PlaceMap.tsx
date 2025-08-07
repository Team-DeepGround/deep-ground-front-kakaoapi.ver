"use client"

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { getCafeReviews, getReviewDetail, ReviewData, ReviewDetailData } from '@/lib/api/places'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, MessageCircle, Image as ImageIcon, Eye } from 'lucide-react'

interface PlaceMapProps {
  mapRef: React.RefObject<HTMLDivElement | null>
  mapInstance?: any // Add mapInstance prop
  onCafeSelect?: (cafe: any) => void
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
  id: number
  placeUrl?: string
  placeId?: string // 카카오맵 place_id 추가
}

export interface PlaceMapRef {
  handleReviewClick: (cafe: CafeData) => void
  searchKakaoPlaceUrl: (name: string, address: string) => Promise<string | null>
}

export const PlaceMap = forwardRef<PlaceMapRef, PlaceMapProps>(({ mapRef, mapInstance, onCafeSelect }, ref) => {
  // 1. 상태 초기화 - any 타입 사용 (kakao 네임스페이스 접근 불가)
  // const [mapInstance, setMapInstance] = useState<any>(null) // REMOVED - now passed as prop
  const selectedMarkerRef = useRef<any>(null)
  const overlayRef = useRef<any>(null)
  const markerRefs = useRef<any[]>([])
  const overlayRefs = useRef<any[]>([])

  // 1. 카페 데이터 상태로 관리
  const [cafeList, setCafeList] = useState<CafeData[]>([])
  const [visibleCafes, setVisibleCafes] = useState<CafeData[]>([])
  const [selectedCafe, setSelectedCafe] = useState<CafeData | null>(null)
  const [sortType, setSortType] = useState<'rating' | 'reviewCount'>('rating')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCentering, setIsCentering] = useState(false)
  
  // 리뷰 관련 상태
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [showReviews, setShowReviews] = useState(false)
  const [selectedCafeForReviews, setSelectedCafeForReviews] = useState<CafeData | null>(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [currentReviewPage, setCurrentReviewPage] = useState(0)
  const [totalReviewPages, setTotalReviewPages] = useState(0)
  
  // 리뷰 상세보기 관련 상태
  const [selectedReviewDetail, setSelectedReviewDetail] = useState<ReviewDetailData | null>(null)
  const [showReviewDetailModal, setShowReviewDetailModal] = useState(false)
  const [reviewDetailLoading, setReviewDetailLoading] = useState(false)

  // 정렬된 리스트 (visibleCafes만)
  const sortedCafeList = [...visibleCafes].sort((a, b) => {
    if (sortType === 'rating') return b.rating - a.rating
    if (sortType === 'reviewCount') return b.reviewCount - a.reviewCount
    return 0
  })

  // 카페 데이터를 가져오는 함수
  const fetchCafeData = async (sortType?: 'rating' | 'reviewCount') => {
    console.log('🚀 fetchCafeData 함수 시작')
    setIsLoading(true)
    setError(null)
    
    try {
      // 1. 별점순/리뷰순에 따라 다른 API 호출
      const currentSortBy = sortType
      const apiUrl = currentSortBy === 'rating' 
        ? `http://localhost:8080/api/v1/communityPlace/byReviewScope`
        : `http://localhost:8080/api/v1/communityPlace/byReviewCount`
      
      console.log('🌐 API 호출 URL:', apiUrl)
      console.log('📊 정렬 기준:', currentSortBy)
      
      const token = localStorage.getItem('auth_token')
      console.log('🔑 토큰 존재 여부:', !!token)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      console.log('📡 API 응답 상태:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('❌ 카페 데이터 API 호출 실패:', response.status, response.statusText, errorText)
        setCafeList([])
        return
      }

      const result = await response.json()
      console.log('✅ API 응답 데이터:', result)
      
      // API별 응답 구조에 따라 데이터 추출 (두 API 모두 result 배열에 데이터)
      let cafeData = null
      
      if (result.result && Array.isArray(result.result)) {
        cafeData = result.result
        console.log('✅ API - result.result에서 데이터 찾음')
      } else if (result.result && !Array.isArray(result.result)) {
        // 단일 객체인 경우 배열로 변환
        cafeData = [result.result]
        console.log('✅ API - 단일 객체를 배열로 변환')
      }
      
      if (!cafeData) {
        console.error('❌ 커뮤니티 장소 조회 API 응답 실패:', {
          code: result.code,
          message: result.message,
          url: apiUrl,
          fullResponse: result
        })
        setCafeList([])
        return
      }

      // API 응답에서 직접 데이터 추출 (개별 API 호출 불필요)
      console.log('🔍 개별 카페 데이터:', cafeData)
      console.log('🔍 첫 번째 카페의 모든 필드:', cafeData[0] ? Object.keys(cafeData[0]) : '데이터 없음')
      console.log('🔍 첫 번째 카페의 전체 데이터:', cafeData[0])
      
      const cafesWithStats: CafeData[] = cafeData.map((cafe: any, index: number) => {
        console.log(`🔍 카페 ${index + 1} 원본 데이터:`, cafe)
        console.log(`🔍 카페 ${index + 1} 모든 필드:`, Object.keys(cafe))
        
        const cafeData = {
          position: new window.kakao.maps.LatLng(cafe.latitude, cafe.longitude),
          name: cafe.name || `카페 ${index + 1}`, // name이 null인 경우 기본값 설정
          rating: cafe.avgScope || 0,
          reviewCount: cafe.countReview || 0,
          address: cafe.location || '',
          phone: cafe.phone || '',
          hours: cafe.hours || '',
          description: cafe.description || '',
          id: cafe.id || index + 1, // 숫자 ID로 변경
          placeUrl: cafe.placeUrl || '',
          placeId: cafe.placeId || cafe.kakaoPlaceId || cafe.place_id || cafe.kakao_place_id || cafe.mapId || cafe.kakaoMapId || cafe.kakaoPlaceId || '' // 카카오맵 place_id 추가
        }
        console.log('🔍 카페 데이터 변환:', cafeData.name, 'placeId:', cafeData.placeId)
        return cafeData
      })

      console.log('🎯 최종 변환된 카페 데이터:', cafesWithStats)
      
      // name이 null이거나 빈 문자열인 카페 필터링
      const validCafes = cafesWithStats.filter(cafe => cafe.name && cafe.name.trim() !== '')
      console.log('✅ 유효한 카페 데이터:', validCafes.length, '개')
      
      setCafeList(validCafes)
      
      // 3. 지도를 카페 위치들로 중심 이동
      if (validCafes.length > 0) {
        centerMapOnCafes(validCafes)
      }
    } catch (err) {
      console.error('❌ 카페 데이터 로딩 실패:', err)
      setCafeList([])
    } finally {
      setIsLoading(false)
    }
  }

  // 카페 위치들로 지도 중심 이동 (현재 위치 기준으로 조정)
  const centerMapOnCafes = (cafes: CafeData[]) => {
    if (!mapInstance?.current || cafes.length === 0) {
      console.log('🗺️ 지도 중심 이동 조건 미충족')
      return
    }

    const actualMapInstance = mapInstance.current
    if (!actualMapInstance.getCenter || !actualMapInstance.getBounds) {
      console.warn('❌ 지도 메서드가 유효하지 않음')
      return
    }

    try {
      // 현재 지도 중심과 줌 레벨 유지
      const currentCenter = actualMapInstance.getCenter()
      const currentLevel = actualMapInstance.getLevel()
      const currentBounds = actualMapInstance.getBounds()
      
      console.log('📍 현재 지도 상태:', {
        center: currentCenter,
        level: currentLevel,
        bounds: currentBounds
      })

      // 유효한 카페들만 필터링
      const validCafes = cafes.filter(cafe => 
        cafe.position && 
        cafe.position.La !== undefined && 
        cafe.position.Ma !== undefined
      )

      if (validCafes.length === 0) {
        console.log('⚠️ 유효한 카페 위치가 없음, 현재 중심 유지')
        return
      }

      // 현재 화면 내에 있는 카페들만 확인
      const cafesInView = validCafes.filter(cafe => {
        if (!currentBounds) return true
        return currentBounds.contain(cafe.position)
      })

      console.log('🎯 현재 화면 내 카페:', cafesInView.length, '개')

      if (cafesInView.length > 0) {
        // 현재 화면에 카페가 있으면 현재 중심 유지
        console.log('✅ 현재 화면에 카페가 있음, 중심 유지')
        actualMapInstance.setCenter(currentCenter)
        actualMapInstance.setLevel(currentLevel)
      } else {
        // 현재 화면에 카페가 없으면 가장 가까운 카페로 중심 이동
        console.log('🔄 현재 화면에 카페가 없음, 가장 가까운 카페로 이동')
        
        const currentLat = currentCenter.getLat()
        const currentLng = currentCenter.getLng()
        
        let closestCafe = validCafes[0]
        let minDistance = Infinity
        
        validCafes.forEach(cafe => {
          const cafeLat = cafe.position.getLat()
          const cafeLng = cafe.position.getLng()
          const distance = Math.sqrt(
            Math.pow(cafeLat - currentLat, 2) + 
            Math.pow(cafeLng - currentLng, 2)
          )
          
          if (distance < minDistance) {
            minDistance = distance
            closestCafe = cafe
          }
        })
        
        console.log('🎯 가장 가까운 카페:', closestCafe.name, '거리:', minDistance)
        actualMapInstance.setCenter(closestCafe.position)
        
        // 줌 레벨은 현재 레벨 유지하되, 너무 멀면 조정
        if (minDistance > 0.1) { // 약 10km 이상
          actualMapInstance.setLevel(Math.max(currentLevel - 1, 3))
        } else {
          actualMapInstance.setLevel(currentLevel)
        }
      }
      
    } catch (error) {
      console.error('❌ 지도 중심 이동 중 오류:', error)
      // 오류 발생 시 현재 중심 유지
      const errorCenter = actualMapInstance.getCenter()
      if (errorCenter) {
        actualMapInstance.setCenter(errorCenter)
      }
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
    // DOM 요소 직접 생성
    const overlayDiv = document.createElement('div')
    overlayDiv.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border: 1px solid #e0e0e0;
      min-width: 200px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
    
    overlayDiv.innerHTML = `
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
        <button class="detail-btn" style="
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
        <button class="review-btn" style="
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
    `
    
    // 버튼 이벤트 리스너를 즉시 추가
    const detailBtn = overlayDiv.querySelector('.detail-btn') as HTMLButtonElement
    const reviewBtn = overlayDiv.querySelector('.review-btn') as HTMLButtonElement
    
    console.log('🔍 오버레이 생성 - 버튼 찾기:', { 
      detailBtn: !!detailBtn, 
      reviewBtn: !!reviewBtn,
      cafeName: cafe.name 
    })
    
    if (detailBtn) {
      // 기존 이벤트 리스너 제거 (중복 방지)
      detailBtn.removeEventListener('mousedown', detailBtn.onmousedown as any)
      
      // mousedown 이벤트 사용 (카카오맵과 충돌 방지)
      detailBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('✅ 상세보기 클릭됨:', cafe.name)
        
        // 카카오맵 place_id를 사용해서 외부 링크로 이동
        console.log('🔍 상세보기 클릭 - placeId 확인:', cafe.placeId, '카페명:', cafe.name)
        console.log('🔍 해당 카페의 전체 데이터:', cafe)
        
        if (cafe.placeId) {
          // 카카오맵 외부 링크로 이동
          const kakaoMapUrl = `https://place.map.kakao.com/${cafe.placeId}`
          console.log('✅ 카카오맵 외부 링크로 이동:', kakaoMapUrl)
          window.open(kakaoMapUrl, '_blank')
        } else {
          // placeId가 없는 경우 기존 방식으로 카카오맵 검색 API 사용
          console.log('🔍 placeId가 없어서 카카오맵 검색 API로 place_url 찾기 시도')
          searchKakaoPlaceUrl(cafe.name, cafe.address || '').then(placeUrl => {
            if (placeUrl) {
              console.log('✅ 카카오맵 검색으로 place_url 찾음:', placeUrl)
              window.open(placeUrl, '_blank')
            } else {
              alert('해당 매장의 상세 정보를 찾을 수 없습니다.')
            }
          }).catch(error => {
            console.error('❌ 카카오맵 검색 실패:', error)
            alert('해당 매장의 상세 정보를 찾을 수 없습니다.')
          })
        }
      })
      console.log('✅ 상세보기 버튼 이벤트 리스너 추가됨')
    }
    
    if (reviewBtn) {
      // mousedown 이벤트 사용 (카카오맵과 충돌 방지)
      reviewBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('✅ 리뷰보기 클릭됨:', cafe.name)
        handleReviewClick(cafe)
      })
      console.log('✅ 리뷰보기 버튼 이벤트 리스너 추가됨')
    }
    
    // 오버레이 생성
    const overlay = new window.kakao.maps.CustomOverlay({
      content: overlayDiv,
      position: cafe.position,
      xAnchor: 0.5,
      yAnchor: 0,
      zIndex: 1001
    })
    
    return overlay
  }

     // 마커를 생성하고 지도 위에 표시하는 함수
         const addMarker = (cafe: CafeData, map: any) => {
     // 지도 인스턴스 유효성 재확인
     if (!map || typeof map !== 'object') {
       console.error('❌ 마커 생성 - 지도 인스턴스가 유효하지 않음');
       return { customMarker: null, overlay: null };
     }
     
     // 커스텀 오버레이 생성 (상세 정보용)
     const overlay = createCustomOverlay(cafe)
     overlay.setMap(null) // 초기에는 숨김
     
     // 커스텀 마커 HTML 생성
     const markerHTML = `
       <div class="custom-marker" style="
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
         position: absolute;
         z-index: 999999;
         visibility: visible;
         opacity: 1;
         transform: translate(-50%, -100%);
       ">
         <div style="
           font-size: 12px;
           color: #FFD600;
           line-height: 1;
           margin-bottom: 2px;
           font-weight: bold;
           text-align: center;
         ">
           ${createStarRating(cafe.rating)}
         </div>
         <div style="
           font-size: 9px;
           color: #4A90E2;
           font-weight: bold;
           line-height: 1;
           margin-bottom: 1px;
           text-align: center;
         ">
           ${cafe.rating}/5.0
         </div>
         <div style="
           font-size: 8px;
           color: #666;
           line-height: 1;
           text-align: center;
         ">
           리뷰 ${cafe.reviewCount}
         </div>
       </div>
     `
     
     console.log('🎯 커스텀 마커 생성 시작:', cafe.name, cafe.position);
     
     // CustomOverlay로 마커 생성
     const customMarker = new window.kakao.maps.CustomOverlay({
       content: markerHTML,
       position: cafe.position,
       xAnchor: 0.5,
       yAnchor: 1.0,
       zIndex: 999999,
       map: map // 지도에 직접 추가
     })
     
     console.log('✅ 커스텀 마커 생성 완료:', cafe.name, customMarker);
     
     // 마커에 데이터 저장
     customMarker.cafeData = cafe
     customMarker.overlay = overlay
     
     // 마커 클릭 이벤트 추가
     if (customMarker.getContent) {
       const content = customMarker.getContent();
       if (content && content.addEventListener) {
         content.addEventListener('click', () => {
           console.log('🎯 마커 클릭됨:', cafe.name);
           
           // 이전 오버레이 숨기기
           if (overlayRef.current) {
             overlayRef.current.setMap(null);
             console.log('🗑️ 이전 오버레이 숨김');
           }
           
           // 새로운 오버레이 생성 및 표시 (버튼 이벤트 리스너가 포함된)
           const newOverlay = createCustomOverlay(cafe);
           newOverlay.setMap(map);
           overlayRef.current = newOverlay;
           selectedMarkerRef.current = { cafeData: cafe, overlay: newOverlay };
           console.log('✅ 새로운 오버레이 생성 및 표시됨:', cafe.name);
           
           setSelectedCafe(cafe);
           if (onCafeSelect) {
             onCafeSelect(cafe);
           }
         });
       }
     }
     
     return { customMarker, overlay }
   }

             // 지도 이벤트 및 핸들러 설정
  useEffect(() => {
    if (!mapInstance?.current || !window.kakao?.maps) {
      console.log('🗺️ 지도 인스턴스 또는 카카오맵 SDK가 없음')
      return
    }

    const actualMapInstance = mapInstance.current;
    if (!actualMapInstance || typeof actualMapInstance !== 'object') {
      console.warn("❌ mapInstance.current가 유효하지 않음");
      return;
    }
    
    console.log('🗺️ 지도 이벤트 설정 시작')

    // bounds 내 카페만 visibleCafes로 관리
    const updateVisibleCafes = () => {
      try {
        const bounds = actualMapInstance.getBounds()
        const filtered = cafeList.filter((cafe) => {
          if (!cafe.position) return false
          return bounds.contain(cafe.position)
        })
        setVisibleCafes(filtered)
      } catch (error) {
        console.warn('⚠️ visibleCafes 업데이트 중 오류:', error);
      }
    }

    // 카페 데이터가 로드되면 visibleCafes 업데이트
    if (cafeList.length > 0) {
      updateVisibleCafes()
    }

    // 기존 이벤트 리스너 제거 (중복 방지)
    try {
      window.kakao.maps.event.removeListener(actualMapInstance, 'idle', updateVisibleCafes)
    } catch (error) {
      // 무시 - 리스너가 없을 수 있음
    }

    // 지도 이벤트 리스너 추가
    try {
      window.kakao.maps.event.addListener(actualMapInstance, 'idle', updateVisibleCafes)
    } catch (error) {
      console.warn('⚠️ 지도 이벤트 리스너 추가 중 오류:', error);
    }

    console.log('🗺️ 지도 생성 완료')
    console.log('🗺️ 지도 중심:', actualMapInstance.getCenter())
    console.log('🗺️ 지도 줌 레벨:', actualMapInstance.getLevel())

    // 전역 리뷰 클릭 핸들러 함수 추가 (먼저 정의)
    ;(window as any).handleReviewClick = function(cafeName: string) {
      console.log('🔍 리뷰보기 클릭:', cafeName)
      
      // 해당 카페 데이터 찾기
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) {
        console.warn('카페를 찾을 수 없습니다:', cafeName)
        return
      }
      
      // 리뷰 조회 실행
      handleReviewClick(cafe)
    }

    // 전역 클릭 핸들러 함수 추가 (오른쪽 패널에서 호출될 때 사용)
    ;(window as any).handleMarkerClick = function(cafeName: string) {
      console.log('마커 클릭 (패널에서):', cafeName)
      
      // 해당 카페 데이터 찾기
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) return
      
      // 기존 오버레이 숨기기
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      
      // 새로운 오버레이 생성 및 표시
      const newOverlay = createCustomOverlay(cafe)
      newOverlay.setMap(actualMapInstance)
      overlayRef.current = newOverlay
      selectedMarkerRef.current = { cafeData: cafe, overlay: newOverlay }

      // 마커 클릭 시 카페 선택 콜백 호출
      if (onCafeSelect) {
        onCafeSelect(cafe)
      }
      setSelectedCafe(cafe)
    }

    // 기존 클릭 이벤트 리스너 제거
    try {
      window.kakao.maps.event.removeListener(actualMapInstance, 'click', null)
    } catch (error) {
      // 무시 - 리스너가 없을 수 있음
    }

    // 지도 클릭 시 선택된 마커 초기화
    try {
      window.kakao.maps.event.addListener(actualMapInstance, 'click', function(e: any) {
        // 클릭된 요소가 오버레이 내부인지 확인
        const target = e.originalEvent?.target
        if (target && (target.closest('button') || target.closest('[style*="background: white"]'))) {
          return // 오버레이 내부 클릭은 무시
        }
        
        // 선택된 마커 초기화
        if (selectedMarkerRef.current) {
          const overlay = selectedMarkerRef.current.overlay
          if (overlay && overlay.setMap) {
            overlay.setMap(null)
          }
          selectedMarkerRef.current = null
        }
        
        // 오버레이 참조 초기화
        if (overlayRef.current) {
          overlayRef.current.setMap(null)
          overlayRef.current = null
        }
        
        // 선택된 카페 상태 초기화
        setSelectedCafe(null)
      })
    } catch (error) {
      console.warn('⚠️ 지도 클릭 이벤트 리스너 추가 중 오류:', error);
    }

  }, [cafeList, onCafeSelect]) // mapInstance 의존성 제거

       // 지도 초기화 로직 제거 - mapInstance는 이제 prop으로 받음

  // 컴포넌트 마운트 시 API 호출 - SDK 준비 후에만 실행
  useEffect(() => {
    console.log('🚀 컴포넌트 마운트 - SDK 준비 상태 확인')
    console.log('🗺️ mapInstance 상태:', !!mapInstance)
    console.log('🗺️ mapInstance.current 상태:', !!mapInstance?.current)
    console.log('🗺️ window.kakao 상태:', !!window.kakao)
    console.log('🗺️ window.kakao.maps 상태:', !!window.kakao?.maps)
    console.log('🗺️ mapRef.current 상태:', !!mapRef.current)
    console.log('🗺️ mapRef.current 크기:', mapRef.current ? `${mapRef.current.offsetWidth}x${mapRef.current.offsetHeight}` : 'N/A')
    
    console.log('🔍 이 useEffect가 실행되었습니다!')
    
    // SDK가 준비되지 않았으면 대기
    if (!window.kakao?.maps) {
      console.log('🗺️ 카카오맵 SDK가 아직 준비되지 않음 - API 호출 대기')
      return
    }
    
    // mapInstance가 준비되지 않았으면 대기
    if (!mapInstance?.current) {
      console.log('🗺️ mapInstance가 아직 준비되지 않음 - API 호출 대기')
      return
    }
    
    console.log('✅ SDK와 mapInstance가 준비됨 - API 호출 시작')
    
    // 전역 함수 미리 정의
    ;(window as any).handleMarkerClick = function(cafeName: string) {
      console.log('마커 클릭 (패널에서):', cafeName)
      
      // 해당 카페 데이터 찾기
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) return
      
      // 기존 오버레이 숨기기
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
        overlayRef.current = null
      }
      
      // 새로운 오버레이 생성 및 표시
      const newOverlay = createCustomOverlay(cafe)
      if (mapInstance?.current) {
        newOverlay.setMap(mapInstance.current)
        overlayRef.current = newOverlay
        selectedMarkerRef.current = { cafeData: cafe, overlay: newOverlay }

        // 마커 클릭 시 카페 선택 콜백 호출
        if (onCafeSelect) {
          onCafeSelect(cafe)
        }
        setSelectedCafe(cafe)
      }
    }
    
    ;(window as any).handleDetailClick = function(cafeName: string) {
      console.log('🔍 상세보기 클릭 (전역):', cafeName)
      
      // 해당 카페 데이터 찾기
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) {
        console.warn('❌ 카페를 찾을 수 없습니다:', cafeName)
        return
      }
      
      console.log('✅ 상세보기 실행:', cafe.name)
      if (cafe.placeId) {
        // 카카오맵 외부 링크로 이동
        const kakaoMapUrl = `https://place.map.kakao.com/${cafe.placeId}`
        console.log('✅ 카카오맵 외부 링크로 이동:', kakaoMapUrl)
        window.open(kakaoMapUrl, '_blank')
      } else if (cafe.placeUrl) {
        // placeId가 없는 경우 기존 방식으로 카카오맵 열기
        window.open(cafe.placeUrl, '_blank')
      } else {
        alert('해당 매장의 상세 정보가 없습니다.')
      }
    }
    
    ;(window as any).handleReviewClick = function(cafeName: string) {
      console.log('🔍 리뷰보기 클릭 (전역):', cafeName)
      console.log('🔍 현재 cafeList:', cafeList)
      
      // 해당 카페 데이터 찾기
      const cafe = cafeList.find(c => c.name === cafeName)
      if (!cafe) {
        console.warn('❌ 카페를 찾을 수 없습니다:', cafeName)
        console.warn('❌ 사용 가능한 카페들:', cafeList.map(c => c.name))
        return
      }
      
      console.log('✅ 카페 찾음:', cafe)
      
      // 리뷰 조회 실행
      handleReviewClick(cafe)
    }
    
    console.log('✅ 마운트 시점 전역 함수 정의 완료')
    
    fetchCafeData()
  }, [mapInstance]) // mapInstance 의존성만 유지

  // 카페 데이터가 변경될 때마다 마커 재생성
  useEffect(() => {
    if (!mapInstance?.current || !cafeList || cafeList.length === 0) {
      console.log('🗺️ 마커 생성 조건 미충족:', { 
        hasMapInstance: !!mapInstance?.current, 
        cafeListLength: cafeList?.length 
      })
      return
    }

    const actualMapInstance = mapInstance.current
    if (!actualMapInstance || typeof actualMapInstance !== 'object') {
      console.warn("❌ mapInstance.current가 유효하지 않음")
      return
    }

    // 지도 상태 확인 - 안전장치
    if (!actualMapInstance.getCenter || !actualMapInstance.getBounds || !actualMapInstance.setCenter) {
      console.warn('❌ 지도 메서드가 유효하지 않음')
      return
    }

    console.log('🗺️ 마커 생성 시작:', cafeList.length, '개 카페')

    // 현재 지도 중심과 줌 레벨 유지 (초기화 방지)
    const currentCenter = actualMapInstance.getCenter()
    const currentLevel = actualMapInstance.getLevel()
    
    console.log('📍 현재 지도 중심:', currentCenter)
    console.log('🔍 현재 줌 레벨:', currentLevel)
    
    // 기존 마커/오버레이 정리 함수
    const cleanupMarkers = () => {
      markerRefs.current.forEach(marker => {
        if (marker?.setMap) {
          try {
            marker.setMap(null)
          } catch (error) {
            console.warn('⚠️ 마커 제거 중 오류:', error)
          }
        }
      })
      overlayRefs.current.forEach(overlay => {
        if (overlay?.setMap) {
          try {
            overlay.setMap(null)
          } catch (error) {
            console.warn('⚠️ 오버레이 제거 중 오류:', error)
          }
        }
      })
      markerRefs.current = []
      overlayRefs.current = []
    }
    
    // 안전한 마커 생성 함수
    const safeCreateMarkers = () => {
      // 현재 지도 중심과 줌 레벨 다시 가져오기
      const currentCenter = actualMapInstance.getCenter()
      const currentLevel = actualMapInstance.getLevel()
      
      try {
        // 1. 기존 마커 정리
        cleanupMarkers()
        
        // 2. 현재 지도 중심 유지 (중요!)
        if (currentCenter) {
          actualMapInstance.setCenter(currentCenter)
        }
        if (currentLevel) {
          actualMapInstance.setLevel(currentLevel)
        }
        
        // 3. 새 마커 생성
        let successCount = 0
        const validCafes = cafeList.filter(cafe => 
          cafe.position && 
          cafe.name && 
          cafe.name.trim() !== '' &&
          cafe.position.La !== undefined &&
          cafe.position.Ma !== undefined
        )
        
        console.log('✅ 유효한 카페:', validCafes.length, '개')
        
        validCafes.forEach((cafe: CafeData, index: number) => {
          try {
            console.log(`🎯 마커 ${index + 1}/${validCafes.length} 생성 시도:`, cafe.name)
            
            const { customMarker, overlay } = addMarker(cafe, actualMapInstance)
            
            if (customMarker) {
              markerRefs.current.push(customMarker)
              successCount++
              console.log(`✅ 마커 ${index + 1} 생성 완료:`, cafe.name)
            }
            
            if (overlay) {
              overlayRefs.current.push(overlay)
            }
          } catch (error) {
            console.error('❌ 개별 마커 생성 실패:', cafe.name, error)
          }
        })
        
        console.log('🎯 마커 생성 완료:', successCount, '개 성공')
        
        // 4. visibleCafes 업데이트
        setVisibleCafes(validCafes)
        
        // 5. 지도 중심 최종 확인 (현재 위치 유지)
        if (currentCenter) {
          actualMapInstance.setCenter(currentCenter)
        }
        
      } catch (error) {
        console.error('❌ 마커 생성 중 치명적 오류:', error)
        // 오류 발생 시에도 현재 중심 유지
        const errorCenter = actualMapInstance.getCenter()
        const errorLevel = actualMapInstance.getLevel()
        if (errorCenter) {
          actualMapInstance.setCenter(errorCenter)
        }
        if (errorLevel) {
          actualMapInstance.setLevel(errorLevel)
        }
      }
    }
    
    // 지도가 완전히 로드된 후 마커 생성
    const checkMapReady = () => {
      try {
        const center = actualMapInstance.getCenter()
        const bounds = actualMapInstance.getBounds()
        
        if (center && bounds) {
          console.log('✅ 지도 준비 완료, 마커 생성 시작')
          safeCreateMarkers()
        } else {
          console.log('⏳ 지도 아직 준비 중, 100ms 후 재시도')
          setTimeout(checkMapReady, 100)
        }
      } catch (error) {
        console.warn('⚠️ 지도 상태 확인 중 오류:', error)
        // 오류 발생 시에도 마커 생성 시도
        setTimeout(safeCreateMarkers, 100)
      }
    }
    
    checkMapReady()
    
  }, [cafeList]) // mapInstance 의존성 제거

  // 리뷰 조회 함수
  const handleReviewClick = async (cafe: CafeData) => {
    console.log('🔍 리뷰 조회 시작:', cafe)
    
    if (!cafe.id) {
      console.warn('❌ 카페 ID가 없습니다:', cafe)
      return
    }
    
    setSelectedCafeForReviews(cafe)
    setReviewsLoading(true)
    setCurrentReviewPage(0)
    
    try {
      console.log('🌐 API 호출 - 카페 ID:', cafe.id)
      const response = await getCafeReviews(cafe.id, 0, 5)
      console.log('📡 API 응답:', response)
      
      // 백엔드 응답 구조에 따라 데이터 추출
      let reviews: ReviewData[] = []
      let totalPages = 0
      
      console.log('🔍 응답 구조 분석:', response)
      console.log('🔍 response.data 타입:', typeof response.data)
      console.log('🔍 response.data 내용:', response.data)
      
      // success 필드가 없거나 true인 경우 처리
      if (response.success !== false) {
        if (response.data && response.data.reviews) {
          // 표준 응답 구조
          reviews = response.data.reviews
          totalPages = response.data.totalPages
          console.log('📊 표준 구조에서 데이터 추출')
        } else if (response.result && response.result.reviews) {
          // 백엔드 SuccessResponse 구조
          reviews = response.result.reviews
          totalPages = response.result.totalPages
          console.log('📊 SuccessResponse 구조에서 데이터 추출')
        } else if (response.data && Array.isArray(response.data)) {
          // 직접 배열로 응답하는 경우
          reviews = response.data
          totalPages = 1
          console.log('📊 배열 구조에서 데이터 추출')
        } else if (response.data && response.data.reviews) {
          // ReviewListResponseDto 직접 반환 구조
          reviews = response.data.reviews
          totalPages = response.data.totalPages
          console.log('📊 ReviewListResponseDto 직접 반환 구조에서 데이터 추출')
        } else if (response.reviews) {
          // 최상위에 reviews가 있는 경우
          reviews = response.reviews
          totalPages = response.totalPages || 1
          console.log('📊 최상위 reviews 구조에서 데이터 추출')
        }
        
        console.log('✅ 리뷰 조회 성공:', { reviews, totalPages })
        setReviews(reviews)
        setTotalReviewPages(totalPages)
      } else {
        console.error('❌ 리뷰 조회 실패:', response.message)
        setReviews([])
        setTotalReviewPages(0)
      }
    } catch (error) {
      console.error('❌ 리뷰 조회 중 오류:', error)
      setReviews([])
      setTotalReviewPages(0)
    } finally {
      setReviewsLoading(false)
    }
  }

  // 리뷰 페이지 변경 함수
  const handleReviewPageChange = async (page: number) => {
    if (!selectedCafeForReviews?.id) return
    
    setReviewsLoading(true)
    setCurrentReviewPage(page)
    
    try {
      const response = await getCafeReviews(selectedCafeForReviews.id, page, 5)
      
      // 백엔드 응답 구조에 따라 데이터 추출
      let reviews: ReviewData[] = []
      let totalPages = 0
      
      // success 필드가 없거나 true인 경우 처리
      if (response.success !== false) {
        if (response.data && response.data.reviews) {
          // 표준 응답 구조
          reviews = response.data.reviews
          totalPages = response.data.totalPages
        } else if (response.result && response.result.reviews) {
          // 백엔드 SuccessResponse 구조
          reviews = response.result.reviews
          totalPages = response.result.totalPages
        } else if (response.data && Array.isArray(response.data)) {
          // 직접 배열로 응답하는 경우
          reviews = response.data
          totalPages = 1
        } else if (response.data && response.data.reviews) {
          // ReviewListResponseDto 직접 반환 구조
          reviews = response.data.reviews
          totalPages = response.data.totalPages
        } else if (response.reviews) {
          // 최상위에 reviews가 있는 경우
          reviews = response.reviews
          totalPages = response.totalPages || 1
        }
        
        setReviews(reviews)
        setTotalReviewPages(totalPages)
      }
    } catch (error) {
      console.error('리뷰 페이지 변경 중 오류:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  // 카페 리스트로 돌아가기
  const handleBackToCafeList = () => {
    setSelectedCafeForReviews(null)
    setReviews([])
    setCurrentReviewPage(0)
    setTotalReviewPages(0)
  }

  // 카카오맵 검색 API로 place_url 찾기
  const searchKakaoPlaceUrl = async (name: string, address: string): Promise<string | null> => {
    try {
      // 카카오맵 검색 API 호출 (REST API 키 필요)
      // 검색 쿼리를 더 간단하게 만듦 (카페명만 사용)
      const searchQuery = name
      
      // 환경 변수 디버깅
      console.log('🔍 환경 변수 확인:')
      console.log('NEXT_PUBLIC_KAKAO_REST_API_KEY:', process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY)
      console.log('KAKAO_REST_API_KEY:', process.env.KAKAO_REST_API_KEY)
      console.log('🔍 검색 쿼리:', searchQuery)
      
      let kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
      
      // 따옴표 제거 (환경 변수가 문자열로 저장된 경우)
      if (kakaoApiKey && typeof kakaoApiKey === 'string') {
        kakaoApiKey = kakaoApiKey.replace(/^["']|["']$/g, '')
      }
      
      if (!kakaoApiKey) {
        console.error('❌ 카카오맵 REST API 키가 설정되지 않았습니다.')
        return null
      }
      
      const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `KakaoAK ${kakaoApiKey}`
        }
      })
      
      if (!response.ok) {
        console.error('카카오맵 검색 API 호출 실패:', response.status)
        return null
      }
      
      const data = await response.json()
      console.log('카카오맵 검색 결과:', data)
      console.log('검색된 문서 수:', data.documents ? data.documents.length : 0)
      
      if (data.documents && data.documents.length > 0) {
        console.log('첫 번째 검색 결과:', data.documents[0])
        console.log('place_url:', data.documents[0].place_url)
        // 첫 번째 결과의 place_url 반환 (http://place.map.kakao.com/{id} 형태)
        return data.documents[0].place_url
      } else {
        console.log('검색 결과가 없습니다. 검색 쿼리:', searchQuery)
        console.log('same_name 정보:', data.same_name)
        
        // same_name의 keyword로 다시 검색 시도
        if (data.same_name && data.same_name.keyword) {
          console.log('🔍 same_name keyword로 재검색 시도:', data.same_name.keyword)
          const retryResponse = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(data.same_name.keyword)}`, {
            headers: {
              'Authorization': `KakaoAK ${kakaoApiKey}`
            }
          })
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            console.log('재검색 결과:', retryData)
            
            if (retryData.documents && retryData.documents.length > 0) {
              console.log('재검색 성공 - place_url:', retryData.documents[0].place_url)
              return retryData.documents[0].place_url
            }
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('카카오맵 검색 중 오류:', error)
      return null
    }
  }

  // 리뷰 상세보기 조회
  const handleReviewDetailClick = async (reviewId: number) => {
    setReviewDetailLoading(true)
    setShowReviewDetailModal(true)
    
    try {
      // scheduleId는 임시로 1로 설정 (실제로는 선택된 스케줄 ID를 사용해야 함)
      const response = await getReviewDetail(reviewId, 1)
      
      console.log('리뷰 상세보기 응답:', response)
      
      // 백엔드 응답 구조에 따라 데이터 추출
      let reviewDetail: ReviewDetailData | null = null
      
      if (response.status === 200) {
        if (response.result) {
          // result 필드에서 데이터 추출
          reviewDetail = response.result
        } else if (response.data) {
          // data 필드에서 데이터 추출
          reviewDetail = response.data
        }
      }
      
      if (reviewDetail) {
        setSelectedReviewDetail(reviewDetail)
      } else {
        console.error('리뷰 상세보기 데이터 추출 실패:', response)
        alert('리뷰 상세보기를 불러올 수 없습니다.')
      }
    } catch (error) {
      console.error('리뷰 상세보기 조회 중 오류:', error)
      alert('리뷰 상세보기를 불러올 수 없습니다.')
    } finally {
      setReviewDetailLoading(false)
    }
  }

  // 외부에서 호출할 수 있도록 리뷰 기능 노출
  useImperativeHandle(ref, () => ({
    handleReviewClick: (cafe: CafeData) => {
      handleReviewClick(cafe)
    },
    searchKakaoPlaceUrl: (name: string, address: string) => {
      return searchKakaoPlaceUrl(name, address)
    }
  }))

  // 리스트에서 카페 클릭 시 마커 오버레이 표시만
  const handleListCafeClick = (cafe: CafeData) => {
    // 마커 오버레이 표시
    if ((window as any).handleMarkerClick) {
      (window as any).handleMarkerClick(cafe.name)
    }
    setSelectedCafe(cafe)
  }

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      console.log('🧹 PlaceMap 컴포넌트 정리 시작')
      
      // 마커 정리
      markerRefs.current.forEach(marker => {
        if (marker && marker.setMap) {
          try {
            marker.setMap(null);
          } catch (error) {
            console.warn('⚠️ 마커 정리 중 오류:', error);
          }
        }
      });
      
      // 오버레이 정리
      overlayRefs.current.forEach(overlay => {
        if (overlay && overlay.setMap) {
          try {
            overlay.setMap(null);
          } catch (error) {
            console.warn('⚠️ 오버레이 정리 중 오류:', error);
          }
        }
      });
      
      // 선택된 마커 정리
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current = null;
      }
      
      if (overlayRef.current) {
        try {
          overlayRef.current.setMap(null);
        } catch (error) {
          console.warn('⚠️ 선택된 오버레이 정리 중 오류:', error);
        }
        overlayRef.current = null;
      }
      
      // 전역 함수 정리
      if ((window as any).handleMarkerClick) {
        delete (window as any).handleMarkerClick;
      }
      if ((window as any).handleReviewClick) {
        delete (window as any).handleReviewClick;
      }
      
      console.log('🧹 PlaceMap 컴포넌트 정리 완료')
    };
  }, []);

  // 로딩 상태 표시 (사이드바만 로딩 표시)
  if (isLoading) {
    return (
      <div className="w-80 bg-white rounded shadow p-4 h-[70vh] overflow-y-auto mt-16 flex items-center justify-center">
        <div className="text-lg">카페 데이터를 불러오는 중...</div>
      </div>
    )
  }

  console.log('🎯 PlaceMap 컴포넌트 렌더링')
  
  return (
    <div className="w-80 bg-white rounded-lg shadow-lg p-4 h-[70vh] overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        {selectedCafeForReviews ? (
          <>
            <h3 className="font-bold text-lg">{selectedCafeForReviews.name} 리뷰</h3>
            <button
              onClick={handleBackToCafeList}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              ← 카페 목록
            </button>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg">카페 목록</h3>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded ${sortType === 'rating' ? 'bg-blue-500 text-white' : 'bg-gray-200'} ${isCentering ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  console.log('🔘 별점순 버튼 클릭됨')
                  if (!isCentering) {
                    setSortType('rating')
                    fetchCafeData('rating')
                  }
                }}
                disabled={isCentering}
              >
                {isCentering ? '지도 이동 중...' : '별점순'}
              </button>
              <button
                className={`px-3 py-1 rounded ${sortType === 'reviewCount' ? 'bg-blue-500 text-white' : 'bg-gray-200'} ${isCentering ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  console.log('🔘 리뷰순 버튼 클릭됨')
                  if (!isCentering) {
                    setSortType('reviewCount')
                    fetchCafeData('reviewCount')
                  }
                }}
                disabled={isCentering}
              >
                {isCentering ? '지도 이동 중...' : '리뷰순'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 카페 리스트 또는 리뷰 리스트 */}
      {selectedCafeForReviews ? (
        // 리뷰 리스트
        <div className="space-y-4">
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : reviews.length > 0 ? (
            <>
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <div key={review.communityPlaceReviewId} className="border rounded-lg p-4 space-y-3">
                    {/* 별점 */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.scope ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <Badge variant="secondary">{review.scope}/5.0</Badge>
                    </div>
                    
                    {/* 리뷰 내용 */}
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {review.content}
                    </p>
                    
                    {/* 이미지 */}
                    {review.mediaUrl && review.mediaUrl.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {review.mediaUrl.map((url, imgIndex) => (
                          <div key={imgIndex} className="flex-shrink-0">
                            <img
                              src={url}
                              alt={`리뷰 이미지 ${imgIndex + 1}`}
                              className="w-20 h-20 object-cover rounded-md"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 상세보기 버튼 */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleReviewDetailClick(review.communityPlaceReviewId)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        상세보기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 페이지네이션 */}
              {totalReviewPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewPageChange(currentReviewPage - 1)}
                    disabled={currentReviewPage === 0}
                  >
                    이전
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    {currentReviewPage + 1} / {totalReviewPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewPageChange(currentReviewPage + 1)}
                    disabled={currentReviewPage >= totalReviewPages - 1}
                  >
                    다음
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>아직 리뷰가 없습니다.</p>
            </div>
          )}
        </div>
      ) : (
        // 카페 리스트
        <div>
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
              {sortedCafeList.map((cafe, index) => (
                <li
                  key={cafe.id || `${cafe.name}-${index}`}
                  className={`mb-4 p-3 rounded border cursor-pointer ${
                    selectedCafe?.name === cafe.name ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'
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
      )}
      
      {/* 리뷰 상세보기 모달 */}
      <Dialog open={showReviewDetailModal} onOpenChange={setShowReviewDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>리뷰 상세보기</DialogTitle>
          </DialogHeader>
          
          {reviewDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : selectedReviewDetail ? (
            <div className="space-y-4">
              {/* 별점 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < selectedReviewDetail.scope ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <Badge variant="secondary">{selectedReviewDetail.scope}/5.0</Badge>
              </div>
              
              {/* 작성자 */}
              <div className="text-sm text-gray-600">
                작성자: {selectedReviewDetail.nickname}
              </div>
              
              {/* 리뷰 내용 */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedReviewDetail.content}
                </p>
              </div>
              
              {/* 이미지 */}
              {selectedReviewDetail.mediaUrl && selectedReviewDetail.mediaUrl.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">첨부 이미지</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReviewDetail.mediaUrl.map((url, imgIndex) => (
                      <div key={imgIndex} className="aspect-square">
                        <img
                          src={url}
                          alt={`리뷰 이미지 ${imgIndex + 1}`}
                          className="w-full h-full object-cover rounded-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              리뷰 정보를 불러올 수 없습니다.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})