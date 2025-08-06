"use client"

import React, { useEffect, useRef, useState } from "react"

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
  id?: number
  placeUrl?: string
}

export function PlaceMap({ mapRef, mapInstance, onCafeSelect }: PlaceMapProps) {
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

  // 정렬된 리스트 (visibleCafes만)
  const sortedCafeList = [...visibleCafes].sort((a, b) => {
    if (sortType === 'rating') return b.rating - a.rating
    if (sortType === 'reviewCount') return b.reviewCount - a.reviewCount
    return 0
  })

  // 카페 데이터를 가져오는 함수
  const fetchCafeData = async (sortType?: 'rating' | 'reviewCount') => {
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
      
      const cafesWithStats: CafeData[] = cafeData.map((cafe: any) => ({
        position: new window.kakao.maps.LatLng(cafe.latitude, cafe.longitude),
        name: cafe.name,
        rating: cafe.avgScope || 0,
        reviewCount: cafe.countReview || 0,
        address: cafe.location || '',
        phone: cafe.phone || '',
        hours: cafe.hours || '',
        description: cafe.description || '',
        id: cafe.id,
        placeUrl: cafe.placeUrl || ''
      }))

      console.log('🎯 최종 변환된 카페 데이터:', cafesWithStats)
      setCafeList(cafesWithStats)
      
      // 3. 지도를 카페 위치들로 중심 이동
      if (cafesWithStats.length > 0) {
        centerMapOnCafes(cafesWithStats)
      }
    } catch (err) {
      console.error('❌ 카페 데이터 로딩 실패:', err)
      setCafeList([])
    } finally {
      setIsLoading(false)
    }
  }

  // 지도를 카페 위치들로 중심 이동하는 함수
  const centerMapOnCafes = (cafes: CafeData[]) => {
    if (!mapInstance?.current || !window.kakao?.maps) {
      console.warn('⚠️ 지도 인스턴스 또는 Kakao Maps SDK가 준비되지 않음')
      return
    }

    const actualMapInstance = mapInstance.current
    console.log('🗺️ 지도 중심 이동 시작:', cafes.length, '개 카페')
    
    // 중심 이동 시작 상태 설정
    setIsCentering(true)

    // 마커 생성 후 지도 중심 이동을 위해 약간의 지연 추가
    setTimeout(() => {
      try {
        if (cafes.length === 1) {
          // 카페가 1개인 경우 해당 위치로 중심 이동
          const cafe = cafes[0]
          console.log('📍 단일 카페로 중심 이동:', cafe.name, cafe.position)
          actualMapInstance.setCenter(cafe.position)
          actualMapInstance.setLevel(3) // 적절한 줌 레벨 설정
        } else {
          // 카페가 여러 개인 경우 모든 카페가 보이도록 경계 설정
          const bounds = new window.kakao.maps.LatLngBounds()
          
          cafes.forEach(cafe => {
            console.log('📍 경계에 추가:', cafe.name, cafe.position)
            bounds.extend(cafe.position)
          })
          
          console.log('🗺️ 경계 설정 완료, 지도 중심 이동')
          actualMapInstance.setBounds(bounds)
          
          // 경계 설정 후 약간의 패딩을 위해 줌 레벨 조정
          setTimeout(() => {
            const currentLevel = actualMapInstance.getLevel()
            if (currentLevel < 5) {
              actualMapInstance.setLevel(currentLevel + 1)
            }
          }, 100)
        }
        
        console.log('✅ 지도 중심 이동 완료')
      } catch (error) {
        console.error('❌ 지도 중심 이동 실패:', error)
      } finally {
        // 중심 이동 완료 상태 해제
        setIsCentering(false)
      }
    }, 300) // 마커 생성 대기 시간
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
          " onclick="${cafe.placeUrl ? `window.open('${cafe.placeUrl}', '_blank')` : 'alert(\'해당 매장의 상세 정보가 없습니다.\')'}">
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
       yAnchor: 0,
       zIndex: 1001 // 마커보다 높은 z-index
     })
  }

     // 마커를 생성하고 지도 위에 표시하는 함수
         const addMarker = (cafe: CafeData, map: any) => {
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
            /* 마커 표시를 위한 기본 설정 */
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
     
                  // CustomOverlay로 마커 생성
       console.log('🎯 커스텀 마커 생성 시작:', cafe.name, cafe.position);
       const customMarker = new window.kakao.maps.CustomOverlay({
         content: markerHTML,
         position: cafe.position,
         xAnchor: 0.5,
         yAnchor: 1.0,
         zIndex: 999999, // 높은 z-index 값
         map: map // 지도에 직접 추가
       })
       console.log('✅ 커스텀 마커 생성 완료:', cafe.name, customMarker);
       
       // 마커가 지도에 제대로 추가되었는지 확인
       if (customMarker.getMap() !== map) {
         console.warn('⚠️ 마커가 지도에 제대로 추가되지 않음:', cafe.name);
         customMarker.setMap(map);
       }
       
       // 마커 생성 직후 추가 확인
       setTimeout(() => {
         if (customMarker.getMap() !== map) {
           console.warn('⚠️ 마커가 지도에서 제거됨, 다시 추가:', cafe.name);
           customMarker.setMap(map);
         }
       }, 50);
      
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           // 마커의 z-index를 강제로 설정
            if (customMarker.getContent) {
              const content = customMarker.getContent();
              if (content && content.style) {
                // CSS 가림 문제 해결을 위한 강력한 설정
                content.style.setProperty('z-index', '999999', 'important');
                content.style.setProperty('position', 'absolute', 'important');
                content.style.setProperty('pointer-events', 'auto', 'important');
                content.style.setProperty('visibility', 'visible', 'important');
                content.style.setProperty('opacity', '1', 'important');
                content.style.setProperty('display', 'block', 'important');
                
                // 마커가 숨겨지지 않도록 추가 설정
                content.style.setProperty('transform', 'translateZ(0)', 'important');
                content.style.setProperty('will-change', 'transform', 'important');
                
                // CSS 가림 방지를 위한 추가 설정
                content.style.setProperty('overflow', 'visible', 'important');
                content.style.setProperty('clip', 'auto', 'important');
                content.style.setProperty('clip-path', 'none', 'important');
                
                // 부모 요소들도 확인하여 가림 방지
                let parent = content.parentElement;
                while (parent && parent !== document.body) {
                  if (parent.style) {
                    parent.style.setProperty('overflow', 'visible', 'important');
                    parent.style.setProperty('z-index', 'auto', 'important');
                  }
                  parent = parent.parentElement;
                }
                
                                 // getBoundingClientRect()로 마커가 실제로 렌더링되는지 확인
                 setTimeout(() => {
                   try {
                     const rect = content.getBoundingClientRect();
                     console.log('📐 마커 getBoundingClientRect 확인:', {
                       cafeName: cafe.name,
                       rect: rect,
                       width: rect.width,
                       height: rect.height,
                       top: rect.top,
                       left: rect.left,
                       bottom: rect.bottom,
                       right: rect.right,
                       isVisible: rect.width > 0 && rect.height > 0,
                       isInViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
                     });
                     
                     // 마커가 보이지 않으면 강제로 표시
                     if (rect.width === 0 || rect.height === 0) {
                       console.log('⚠️ 마커가 렌더링되지 않음:', cafe.name);
                       content.style.setProperty('display', 'flex', 'important');
                       content.style.setProperty('visibility', 'visible', 'important');
                       content.style.setProperty('opacity', '1', 'important');
                       content.style.setProperty('width', '60px', 'important');
                       content.style.setProperty('height', '60px', 'important');
                       content.style.setProperty('position', 'absolute', 'important');
                       content.style.setProperty('transform', 'translate(-50%, -100%)', 'important');
                       
                       // 마커를 다시 지도에 추가
                       customMarker.setMap(map);
                     }
                   } catch (error) {
                     console.error('❌ getBoundingClientRect 확인 실패:', cafe.name, error);
                   }
                 }, 200);
               }
             }
      
             // 마커에 데이터 저장
       customMarker.cafeData = cafe
       customMarker.overlay = overlay
       
                                                                                                                                           // 마커 생성 후 약간의 지연을 두고 마커 표시 확인
            setTimeout(() => {
              if (customMarker.getContent) {
                const content = customMarker.getContent();
                if (content && content.style) {
                  // 마커가 제대로 표시되는지 확인하고 필요시 재설정
                  const computedStyle = window.getComputedStyle(content);
                  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                    content.style.setProperty('display', 'flex', 'important');
                    content.style.setProperty('visibility', 'visible', 'important');
                    content.style.setProperty('opacity', '1', 'important');
                    content.style.setProperty('position', 'absolute', 'important');
                    content.style.setProperty('transform', 'translate(-50%, -100%)', 'important');
                    console.log('🔧 마커 표시 재설정 완료:', cafe.name);
                  }
                  
                  // 마커가 지도에 제대로 추가되었는지 재확인
                  if (customMarker.getMap() !== map) {
                    console.warn('⚠️ 마커가 지도에서 제거됨, 다시 추가:', cafe.name);
                    customMarker.setMap(map);
                  }
                }
              }
            }, 100);
     
     // 마커 클릭 이벤트 추가
     if (customMarker.getContent) {
       const content = customMarker.getContent();
       if (content && content.addEventListener) {
         content.addEventListener('click', () => {
           console.log('🎯 마커 클릭됨:', cafe.name);
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
    if (!mapInstance || !mapInstance.current || !window.kakao || !window.kakao.maps) {
      console.log('🗺️ 지도 인스턴스 또는 카카오맵 SDK가 없음')
      return
    }

    // ✅ mapInstance.current가 올바른 Kakao Map 객체인지 확인
    const actualMapInstance = mapInstance.current;
    if (!actualMapInstance || typeof actualMapInstance !== 'object') {
      console.warn("❌ mapInstance.current가 유효하지 않음");
      return;
    }
    
    // 기본적인 Kakao Map 메서드들 확인
    const requiredMethods = ['getCenter', 'getBounds', 'getLevel', 'setCenter', 'relayout'];
    const missingMethods = requiredMethods.filter(method => typeof actualMapInstance[method] !== 'function');
    
    if (missingMethods.length > 0) {
      console.warn("❌ mapInstance.current에 필요한 메서드가 없음:", missingMethods);
      return;
    }
    
    // 지도가 실제로 렌더링되었는지 확인
    try {
      const center = actualMapInstance.getCenter();
      const bounds = actualMapInstance.getBounds();
      const level = actualMapInstance.getLevel();
      
      if (!center || !bounds || typeof center.getLat !== 'function' || typeof bounds.contain !== 'function') {
        console.warn('❌ 지도가 아직 완전히 초기화되지 않음');
        return;
      }
    } catch (error) {
      console.error('❌ 지도 상태 확인 중 오류:', error);
      return;
    }

    // 지도 DOM 요소 확인
    if (!mapRef.current) {
      console.log('🗺️ mapRef.current가 아직 준비되지 않음 - 이벤트 설정 대기')
      return
    }

    const map = actualMapInstance
     console.log('🗺️ 지도 이벤트 설정 시작')

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

     console.log('🗺️ 지도 생성 완료')
     console.log('🗺️ 지도 중심:', map.getCenter())
     console.log('🗺️ 지도 줌 레벨:', map.getLevel())

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
               setSelectedCafe(cafeList.find(cafe => cafe.name === cafeName) || null)
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

   }, [mapInstance, cafeList, onCafeSelect])

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
    
    // SDK가 준비되지 않았으면 대기
    if (!window.kakao || !window.kakao.maps) {
      console.log('🗺️ 카카오맵 SDK가 아직 준비되지 않음 - API 호출 대기')
      return
    }
    
    // mapInstance가 준비되지 않았으면 대기
    if (!mapInstance || !mapInstance.current) {
      console.log('🗺️ mapInstance가 아직 준비되지 않음 - API 호출 대기')
      return
    }
    
    // mapInstance가 유효한지 확인
    const actualMapInstance = mapInstance.current
    if (!actualMapInstance || typeof actualMapInstance !== 'object') {
      console.log('🗺️ mapInstance.current가 유효하지 않음 - API 호출 대기')
      return
    }
    
    // instanceof kakao.maps.Map 확인
    if (!(actualMapInstance instanceof window.kakao.maps.Map)) {
      console.log('🗺️ mapInstance.current가 kakao.maps.Map 인스턴스가 아님 - API 호출 대기')
      return
    }
    
    // 필수 메서드 확인
    const requiredMethods = ['getCenter', 'getBounds', 'getLevel']
    const missingMethods = requiredMethods.filter(method => typeof actualMapInstance[method] !== 'function')
    
    if (missingMethods.length > 0) {
      console.log('🗺️ mapInstance에 필수 메서드가 없음 - API 호출 대기:', missingMethods)
      return
    }
    
    console.log('✅ SDK와 mapInstance가 준비됨 - API 호출 시작')
    fetchCafeData()
  }, [mapInstance]) // mapInstance 의존성 추가

             // cafeList가 변경될 때마다 마커 직접 생성
  useEffect(() => {
    console.log('🔄 cafeList 변경 감지:', cafeList.length, '개의 카페')
    console.log('🗺️ mapInstance 상태:', !!mapInstance)
    console.log('🗺️ mapInstance.current 상태:', !!mapInstance?.current)
    
    // 1. mapInstance가 완전히 초기화되었는지 확인
    if (!mapInstance || !mapInstance.current) {
      console.log('🗺️ mapInstance가 아직 준비되지 않음 - 마커 생성 대기')
      return
    }

    // 2. mapInstance.current가 올바른 Kakao Map 객체인지 확인
    const actualMapInstance = mapInstance.current;
    if (!actualMapInstance || typeof actualMapInstance !== 'object') {
      console.warn("❌ mapInstance.current가 유효하지 않음");
      return;
    }
    
    // 3. instanceof kakao.maps.Map 확인 (더 정확한 타입 체크)
    if (!(actualMapInstance instanceof window.kakao.maps.Map)) {
      console.warn("❌ mapInstance.current가 kakao.maps.Map 인스턴스가 아님");
      return;
    }
    
    // 4. 기본적인 Kakao Map 메서드들 확인
    const requiredMethods = ['getCenter', 'getBounds', 'getLevel', 'setCenter', 'relayout'];
    const missingMethods = requiredMethods.filter(method => typeof actualMapInstance[method] !== 'function');
    
    if (missingMethods.length > 0) {
      console.warn("❌ mapInstance.current에 필요한 메서드가 없음:", missingMethods);
      return;
    }
    
    // 5. 지도 DOM 요소가 준비되었는지 확인
    if (!mapRef.current) {
      console.log('🗺️ mapRef.current가 아직 준비되지 않음 - 마커 생성 대기')
      return
    }
    
    // 6. 지도 DOM 요소의 크기 확인
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      console.log('🗺️ 지도 DOM 요소 크기가 0 - 마커 생성 대기')
      return
    }
    
    // 7. 카카오맵 SDK가 준비되었는지 확인
    if (!window.kakao || !window.kakao.maps) {
      console.log('🗺️ 카카오맵 SDK가 아직 준비되지 않음 - 마커 생성 대기')
      return
    }
    
    // 8. 카페 데이터가 있는지 확인
    if (cafeList.length === 0) {
      console.log('🗺️ 카페 데이터가 없음 - 마커 생성 스킵')
      return
    }
    
    // 9. 지도가 실제로 렌더링되었는지 확인
    try {
      const center = actualMapInstance.getCenter();
      const bounds = actualMapInstance.getBounds();
      const level = actualMapInstance.getLevel();
      
      console.log('🗺️ 지도 상태 확인:', {
        center: center,
        bounds: bounds,
        level: level,
        isValidCenter: center && typeof center.getLat === 'function',
        isValidBounds: bounds && typeof bounds.contain === 'function'
      });
      
      if (!center || !bounds || typeof center.getLat !== 'function' || typeof bounds.contain !== 'function') {
        console.warn('❌ 지도가 아직 완전히 초기화되지 않음');
        return;
      }
    } catch (error) {
      console.error('❌ 지도 상태 확인 중 오류:', error);
      return;
    }
      
             // 8. 기존 마커/오버레이 모두 제거 (상태 꼬임 방지)
      markerRefs.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      overlayRefs.current.forEach(overlay => {
        if (overlay && overlay.setMap) {
          overlay.setMap(null);
        }
      });
      markerRefs.current = [];
      overlayRefs.current = [];
      
                   // 9. 모든 카페에 대해 마커 생성
      console.log('🎯 마커 생성 시작 - 총', cafeList.length, '개의 카페');
             console.log('🗺️ 지도 상태 확인:', {
         mapInstanceExists: !!actualMapInstance,
         mapInstanceType: typeof actualMapInstance,
         hasGetCenter: actualMapInstance && typeof actualMapInstance.getCenter === 'function',
         hasGetBounds: actualMapInstance && typeof actualMapInstance.getBounds === 'function',
         hasGetLevel: actualMapInstance && typeof actualMapInstance.getLevel === 'function',
         hasSetCenter: actualMapInstance && typeof actualMapInstance.setCenter === 'function',
         hasRelayout: actualMapInstance && typeof actualMapInstance.relayout === 'function',
         mapRefExists: !!mapRef.current,
         mapRefWidth: mapRef.current?.offsetWidth,
         mapRefHeight: mapRef.current?.offsetHeight,
         center: actualMapInstance.getCenter?.(),
         bounds: actualMapInstance.getBounds?.(),
         level: actualMapInstance.getLevel?.()
       });
       cafeList.forEach((cafe: CafeData, index: number) => {
         console.log(`🎯 마커 ${index + 1}/${cafeList.length} 생성:`, cafe.name);
         try {
           const { customMarker, overlay } = addMarker(cafe, actualMapInstance);
           markerRefs.current.push(customMarker);
           overlayRefs.current.push(overlay);
           console.log(`✅ 마커 ${index + 1} 생성 완료:`, cafe.name);
           
           // 10. 마커 좌표 및 범위 확인
           if (customMarker && typeof customMarker.getPosition === 'function') {
             const markerPosition = customMarker.getPosition();
             const bounds = actualMapInstance.getBounds();
             const isInBounds = bounds.contain(markerPosition);
            
            console.log('📍 마커 정보 확인:', {
              cafeName: cafe.name,
              position: markerPosition,
              isInBounds: isInBounds,
              bounds: bounds
            });
            
            // 11. 뷰포트 밖 마커 처리
            if (!isInBounds) {
              console.log('⚠️ 마커가 지도 범위 밖에 있음:', cafe.name);
              // 마커를 지도 범위 안으로 이동하거나 숨김 처리
              if (customMarker.setMap) {
                customMarker.setMap(null);
                console.log('🔧 뷰포트 밖 마커 제거:', cafe.name);
              }
            }
          }
        } catch (error) {
          console.error('❌ 마커 생성 실패:', cafe.name, error)
        }
      });
      
      console.log('🎯 마커 생성 완료:', markerRefs.current.length, '개')
      
      // 12. visibleCafes 업데이트
      setVisibleCafes(cafeList)
      
             // 13. 마커 생성 완료 후 지도 이벤트 리스너 설정 (중복 방지)
       if (actualMapInstance && markerRefs.current.length > 0) {
         // mapInstance 유효성 재확인
         if (!(actualMapInstance instanceof window.kakao.maps.Map)) {
           console.warn("❌ 이벤트 리스너 설정 - mapInstance가 kakao.maps.Map 인스턴스가 아님");
           return;
         }
         
         // 필수 메서드 재확인
         const requiredMethods = ['getCenter', 'getBounds', 'getLevel', 'setCenter', 'relayout'];
         const missingMethods = requiredMethods.filter(method => typeof actualMapInstance[method] !== 'function');
         
         if (missingMethods.length > 0) {
           console.warn("❌ 이벤트 리스너 설정 - mapInstance에 필요한 메서드가 없음:", missingMethods);
           return;
         }
         
         // 지도가 실제로 렌더링되었는지 재확인
         try {
           const center = actualMapInstance.getCenter();
           const bounds = actualMapInstance.getBounds();
           const level = actualMapInstance.getLevel();
           
           if (!center || !bounds || typeof center.getLat !== 'function' || typeof bounds.contain !== 'function') {
             console.warn('❌ 이벤트 리스너 설정 - 지도가 아직 완전히 초기화되지 않음');
             return;
           }
         } catch (error) {
           console.error('❌ 이벤트 리스너 설정 - 지도 상태 확인 중 오류:', error);
           return;
         }
         
         // 기존 이벤트 리스너 제거 (중복 방지)
         window.kakao.maps.event.removeListener(actualMapInstance, 'tilesloaded', null);
         window.kakao.maps.event.removeListener(actualMapInstance, 'zoom_changed', null);
        
         // 지도 타일 렌더링 완료 후 마커 표시 확인
         window.kakao.maps.event.addListener(actualMapInstance, 'tilesloaded', () => {
           console.log('🗺️ 지도 타일 로딩 완료 - 마커 표시 확인')
           markerRefs.current.forEach(marker => {
             if (marker && marker.getContent) {
               const content = marker.getContent();
               if (content && content.style) {
                 const computedStyle = window.getComputedStyle(content);
                 if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                   content.style.setProperty('display', 'block', 'important');
                   content.style.setProperty('visibility', 'visible', 'important');
                   console.log('🔧 마커 표시 복구 완료');
                 }
                 
                 // getBoundingClientRect()로 마커 렌더링 상태 확인
                 try {
                   const rect = content.getBoundingClientRect();
                   console.log('📐 tilesloaded - 마커 getBoundingClientRect:', {
                     width: rect.width,
                     height: rect.height,
                     top: rect.top,
                     left: rect.left,
                     isVisible: rect.width > 0 && rect.height > 0,
                     isInViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
                   });
                   
                   // 마커가 보이지 않으면 강제로 표시
                   if (rect.width === 0 || rect.height === 0) {
                     console.log('⚠️ tilesloaded - 마커가 렌더링되지 않음');
                     content.style.setProperty('display', 'block', 'important');
                     content.style.setProperty('visibility', 'visible', 'important');
                     content.style.setProperty('opacity', '1', 'important');
                     content.style.setProperty('width', '60px', 'important');
                     content.style.setProperty('height', '60px', 'important');
                   }
                 } catch (error) {
                   console.error('❌ tilesloaded - getBoundingClientRect 확인 실패:', error);
                 }
               }
             }
           });
         });
        
                 // 지도 줌 변경 시에도 마커 표시 확인
         window.kakao.maps.event.addListener(actualMapInstance, 'zoom_changed', () => {
           console.log('🗺️ 지도 줌 변경 - 마커 표시 확인')
           markerRefs.current.forEach(marker => {
             if (marker && marker.getContent) {
               const content = marker.getContent();
               if (content && content.style) {
                 const computedStyle = window.getComputedStyle(content);
                 if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                   content.style.setProperty('display', 'block', 'important');
                   content.style.setProperty('visibility', 'visible', 'important');
                   console.log('🔧 마커 표시 복구 완료');
                 }
                 
                 // getBoundingClientRect()로 마커 렌더링 상태 확인
                 try {
                   const rect = content.getBoundingClientRect();
                   console.log('📐 zoom_changed - 마커 getBoundingClientRect:', {
                     width: rect.width,
                     height: rect.height,
                     top: rect.top,
                     left: rect.left,
                     isVisible: rect.width > 0 && rect.height > 0,
                     isInViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
                   });
                   
                   // 마커가 보이지 않으면 강제로 표시
                   if (rect.width === 0 || rect.height === 0) {
                     console.log('⚠️ zoom_changed - 마커가 렌더링되지 않음');
                     content.style.setProperty('display', 'block', 'important');
                     content.style.setProperty('visibility', 'visible', 'important');
                     content.style.setProperty('opacity', '1', 'important');
                     content.style.setProperty('width', '60px', 'important');
                     content.style.setProperty('height', '60px', 'important');
                   }
                 } catch (error) {
                   console.error('❌ zoom_changed - getBoundingClientRect 확인 실패:', error);
                 }
               }
             }
           });
         });
        
        console.log('✅ 마커 생성 완료 및 이벤트 리스너 설정 완료');
      }
    }, [cafeList, mapInstance])

               // 마커 표시 강제 실행 함수
    const ensureMarkersVisible = (map: any, markers: any[]) => {
      console.log('👁️ 마커 표시 강제 실행 시작');
      
      // 1. 지도 리렌더링 트리거
      const center = map.getCenter();
      map.setCenter(new window.kakao.maps.LatLng(
        center.getLat() + 0.00001, 
        center.getLng()
      ));
      
      setTimeout(() => {
        // 2. 원래 위치로 복원
        map.setCenter(center);
        
        // 3. 레이아웃 재계산
        window.kakao.maps.event.trigger(map, 'resize');
        map.relayout();
        
                 // 4. 모든 마커의 표시 상태 확인 및 재설정
         markers.forEach((marker) => {
           if (marker && marker.getContent) {
             const content = marker.getContent();
             if (content && content.style) {
               // 마커가 숨겨져 있는지 확인
               const computedStyle = window.getComputedStyle(content);
               if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
                 // 마커를 다시 표시
                 content.style.setProperty('display', 'block', 'important');
                 content.style.setProperty('visibility', 'visible', 'important');
                 content.style.setProperty('opacity', '1', 'important');
                 content.style.setProperty('z-index', '999999', 'important');
                 content.style.setProperty('position', 'relative', 'important');
                 console.log('🔧 마커 표시 복구 완료');
               }
               
               // getBoundingClientRect()로 마커 렌더링 상태 확인
               try {
                 const rect = content.getBoundingClientRect();
                 console.log('📐 ensureMarkersVisible - 마커 getBoundingClientRect:', {
                   width: rect.width,
                   height: rect.height,
                   top: rect.top,
                   left: rect.left,
                   isVisible: rect.width > 0 && rect.height > 0,
                   isInViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
                 });
                 
                 // 마커가 보이지 않으면 강제로 표시
                 if (rect.width === 0 || rect.height === 0) {
                   console.log('⚠️ ensureMarkersVisible - 마커가 렌더링되지 않음');
                   content.style.setProperty('display', 'block', 'important');
                   content.style.setProperty('visibility', 'visible', 'important');
                   content.style.setProperty('opacity', '1', 'important');
                   content.style.setProperty('width', '60px', 'important');
                   content.style.setProperty('height', '60px', 'important');
                 }
               } catch (error) {
                 console.error('❌ ensureMarkersVisible - getBoundingClientRect 확인 실패:', error);
               }
             }
           }
         });
        
        console.log('✅ 마커 표시 강제 실행 완료');
      }, 50);
    };

  // visibleCafes 관련 useEffect 제거 (불필요)
 
  // 리스트에서 카페 클릭 시 마커 오버레이 표시만
  const handleListCafeClick = (cafe: CafeData) => {
    // 마커 오버레이 표시
    if ((window as any).handleMarkerClick) {
      (window as any).handleMarkerClick(cafe.name)
    }
    setSelectedCafe(cafe)
  }

  // 로딩 상태 표시 (사이드바만 로딩 표시)
  if (isLoading) {
    return (
      <div className="w-80 bg-white rounded shadow p-4 h-[70vh] overflow-y-auto mt-16 flex items-center justify-center">
        <div className="text-lg">카페 데이터를 불러오는 중...</div>
      </div>
    )
  }

return (
  <div className="w-80 bg-white rounded shadow p-4 h-[70vh] overflow-y-auto mt-16">
             <div className="flex gap-2 mb-4">
         <button
                       className={`px-3 py-1 rounded ${sortType === 'rating' ? 'bg-blue-500 text-white' : 'bg-gray-200'} ${isCentering ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (!isCentering) {
                setSortType('rating')
                fetchCafeData('rating') // 별점순으로 데이터 다시 로드
              }
            }}
            disabled={isCentering}
         >
           {isCentering ? '지도 이동 중...' : '별점순'}
         </button>
         <button
                       className={`px-3 py-1 rounded ${sortType === 'reviewCount' ? 'bg-blue-500 text-white' : 'bg-gray-200'} ${isCentering ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (!isCentering) {
                setSortType('reviewCount')
                fetchCafeData('reviewCount') // 리뷰순으로 데이터 다시 로드
              }
            }}
            disabled={isCentering}
         >
           {isCentering ? '지도 이동 중...' : '리뷰순'}
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
  )
}