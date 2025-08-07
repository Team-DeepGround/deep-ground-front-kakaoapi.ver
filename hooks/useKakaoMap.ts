"use client"

import { useState, useEffect, useRef } from "react"

declare global {
  interface Window {
    kakao: any
  }
}

const KAKAO_JAVASCRIPT_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
console.log('KAKAO_JAVASCRIPT_KEY:', KAKAO_JAVASCRIPT_KEY)

// 기본 지도 훅 (공통 기능)
export function useKakaoMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const [isMapReady, setIsMapReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const mapInstance = useRef<any>(null)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isDomReady, setIsDomReady] = useState(false)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const refCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ref가 준비될 때까지 기다리는 로직
  useEffect(() => {
    if (!mapContainerRef.current) {
      console.log('🗺️ mapContainerRef.current가 아직 준비되지 않음 - 폴링 시작')
      
      // ref가 준비될 때까지 폴링
      refCheckIntervalRef.current = setInterval(() => {
        if (mapContainerRef.current) {
          console.log('🗺️ mapContainerRef.current가 준비됨')
          clearInterval(refCheckIntervalRef.current!)
          refCheckIntervalRef.current = null
          
          // DOM 요소 준비 상태 체크를 다시 실행
          const container = mapContainerRef.current
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            console.log('🗺️ DOM 요소가 이미 준비됨')
            setIsDomReady(true)
          }
        }
      }, 100) // 100ms마다 체크

      return () => {
        if (refCheckIntervalRef.current) {
          clearInterval(refCheckIntervalRef.current)
          refCheckIntervalRef.current = null
        }
      }
    }
  }, [mapContainerRef])

  // DOM 요소 준비 상태 확인
  useEffect(() => {
    if (!mapContainerRef.current) {
      console.log('🗺️ mapContainerRef.current가 아직 준비되지 않음')
      setIsDomReady(false)
      return
    }

    const container = mapContainerRef.current
    
    // DOM 요소의 실제 상태 확인
    console.log('🗺️ DOM 요소 상태 확인:', {
      exists: !!container,
      tagName: container.tagName,
      id: container.id,
      className: container.className,
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight,
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      getBoundingClientRect: container.getBoundingClientRect(),
      computedStyle: window.getComputedStyle(container)
    })
    
    // 기존 ResizeObserver 정리
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }
    
    // DOM 요소의 크기가 0이면 대기
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.log('🗺️ DOM 요소 크기가 0 - ResizeObserver로 대기')
      setIsDomReady(false)
      
      // 강제로 크기 설정 시도
      container.style.width = '100%'
      container.style.height = '100%'
      container.style.minHeight = '400px'
      container.style.minWidth = '300px'
      container.style.display = 'block'
      
      // ResizeObserver를 사용하여 DOM 크기 변화 감지
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          console.log('🗺️ DOM 크기 변화 감지:', { width, height })
          
          if (width > 0 && height > 0) {
            console.log('🗺️ DOM 요소가 준비됨')
            setIsDomReady(true)
            resizeObserver.disconnect()
            resizeObserverRef.current = null
            break
          }
        }
      })
      
      resizeObserver.observe(container)
      resizeObserverRef.current = resizeObserver
      
      // 추가로 MutationObserver를 사용하여 DOM 변화 감지
      const mutationObserver = new MutationObserver(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          console.log('🗺️ MutationObserver로 DOM 요소 준비 감지')
          setIsDomReady(true)
          mutationObserver.disconnect()
        }
      })
      
      mutationObserver.observe(container, {
        attributes: true,
        childList: true,
        subtree: true
      })
      
      // 추가로 setTimeout으로 강제 체크
      const timeoutId = setTimeout(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          console.log('🗺️ setTimeout으로 DOM 요소 준비 감지')
          setIsDomReady(true)
          resizeObserver.disconnect()
          resizeObserverRef.current = null
          mutationObserver.disconnect()
        }
      }, 500)
      
      return () => {
        resizeObserver.disconnect()
        resizeObserverRef.current = null
        mutationObserver.disconnect()
        clearTimeout(timeoutId)
      }
    } else {
      console.log('🗺️ DOM 요소가 이미 준비됨')
      setIsDomReady(true)
    }
  }, [mapContainerRef, isDomReady])

  useEffect(() => {
    console.log('🗺️ useKakaoMap 훅 시작')
    console.log('🗺️ KAKAO_JAVASCRIPT_KEY:', KAKAO_JAVASCRIPT_KEY)
    console.log('🗺️ mapContainerRef.current:', !!mapContainerRef.current)
    console.log('🗺️ isDomReady:', isDomReady)
    
    // DOM 요소가 준비되지 않았으면 대기
    if (!mapContainerRef.current || !isDomReady) {
      console.log('🗺️ DOM 요소가 아직 준비되지 않음 - 대기')
      return
    }
    
    const scriptId = "kakao-map-script"
    
    const initMap = () => {
      console.log('🗺️ initMap 함수 호출')
      console.log('🗺️ window.kakao 상태:', !!window.kakao)
      console.log('🗺️ window.kakao.maps 상태:', !!window.kakao?.maps)
      
      // DOM 요소 재확인
      if (!mapContainerRef.current) {
        console.error('🗺️ initMap에서 mapContainerRef.current가 null입니다!')
        return
      }
      
      window.kakao.maps.load(() => {
        console.log('🗺️ kakao.maps.load 콜백 실행')
        let lat = 37.5665
        let lng = 126.9780

        const createMap = (lat: number, lng: number) => {
          console.log('🗺️ createMap 함수 호출')
          console.log('🗺️ mapContainerRef.current:', !!mapContainerRef.current)
          
          // DOM 요소 최종 확인
          if (!mapContainerRef.current) {
            console.error('🗺️ createMap에서 mapContainerRef.current가 null입니다!')
            return
          }
          
          // DOM 요소 크기 재확인
          if (mapContainerRef.current.offsetWidth === 0 || mapContainerRef.current.offsetHeight === 0) {
            console.error('🗺️ DOM 요소 크기가 0입니다!')
            return
          }
          
          try {
            const map = new window.kakao.maps.Map(mapContainerRef.current, {
              center: new window.kakao.maps.LatLng(lat, lng),
              level: 3,
            })
            
            console.log('🗺️ 지도 인스턴스 생성 성공:', !!map)
            
            // 지도 인스턴스 유효성 검증
            if (!map || typeof map !== 'object') {
              console.error('🗺️ 생성된 지도 인스턴스가 유효하지 않음')
              return
            }
            
            // 필수 메서드 확인
            const requiredMethods = ['getCenter', 'getBounds', 'getLevel', 'setCenter', 'relayout']
            const missingMethods = requiredMethods.filter(method => typeof map[method] !== 'function')
            
            if (missingMethods.length > 0) {
              console.error('🗺️ 지도 인스턴스에 필수 메서드가 없음:', missingMethods)
              return
            }
            
            mapInstance.current = map
            setIsMapReady(true)
            setIsLoading(false)
            setMyLocation({ lat, lng })
            console.log('🗺️ 지도 상태 업데이트 완료')
            console.log('🗺️ mapInstance.current 확인:', !!mapInstance.current)
            
            // 지도가 생성된 후 relayout 호출하여 크기 조정
            setTimeout(() => {
              if (mapInstance.current) {
                try {
                  mapInstance.current.relayout()
                  console.log('🗺️ 지도 relayout 완료')
                } catch (error) {
                  console.error('🗺️ 지도 relayout 실패:', error)
                }
              }
            }, 100)
          } catch (error) {
            console.error('🗺️ 지도 생성 중 오류:', error)
          }
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            position => {
              lat = position.coords.latitude
              lng = position.coords.longitude
              createMap(lat, lng)
            },
            () => {
              createMap(lat, lng)
            },
            { timeout: 5000 } // 5초 타임아웃 추가
          )
        } else {
          createMap(lat, lng)
        }
      })
    }

    // 이미 스크립트가 로드되어 있는 경우
    if (document.getElementById(scriptId)) {
      if (window.kakao && window.kakao.maps) {
        initMap()
      } else {
        // 스크립트는 있지만 아직 로드되지 않은 경우
        const script = document.getElementById(scriptId) as HTMLScriptElement
        script.onload = initMap
      }
    } else {
      // 스크립트가 없는 경우 새로 생성
      const script = document.createElement("script")
      script.id = scriptId
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JAVASCRIPT_KEY}&autoload=false&libraries=services`
      script.async = true
      document.head.appendChild(script)
      script.onload = initMap
    }
  }, [mapContainerRef, isDomReady])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
      if (refCheckIntervalRef.current) {
        clearInterval(refCheckIntervalRef.current)
        refCheckIntervalRef.current = null
      }
    }
  }, [])

  return { mapInstance, isMapReady, isLoading, myLocation }
}

// 스터디 일정 추가용 간단한 지도 훅
export function useScheduleMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const baseMap = useKakaoMap(mapContainerRef)
  
  // 스터디 일정 추가에 필요한 추가 기능들
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  
  // 선택된 장소를 지도에 표시
  const showSelectedPlace = (place: any) => {
    if (!baseMap.mapInstance.current || !place) return
    
    // 기존 마커 제거
    if (window.kakao && window.kakao.maps) {
      // 마커 관리 로직 추가 가능
    }
    
    setSelectedPlace(place)
  }
  
  return {
    ...baseMap,
    selectedPlace,
    showSelectedPlace,
    setSelectedPlace
  }
}

// 모임장소 페이지용 고급 지도 훅
export function usePlaceMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const baseMap = useKakaoMap(mapContainerRef)
  
  // 모임장소 페이지에 필요한 추가 기능들
  const [placeMarkers, setPlaceMarkers] = useState<any[]>([])
  const [selectedCafe, setSelectedCafe] = useState<any>(null)
  
  // 주변 장소 검색 및 마커 표시
  const searchNearbyPlaces = async (keyword: string, center?: { lat: number; lng: number }) => {
    if (!baseMap.mapInstance.current) return
    
    // 주변 장소 검색 로직
    // 카테고리별 검색, 거리별 필터링 등
  }
  
  // 카페 선택 시 상세 정보 표시
  const selectCafe = (cafe: any) => {
    setSelectedCafe(cafe)
  }
  
  return {
    ...baseMap,
    placeMarkers,
    selectedCafe,
    searchNearbyPlaces,
    selectCafe
  }
} 