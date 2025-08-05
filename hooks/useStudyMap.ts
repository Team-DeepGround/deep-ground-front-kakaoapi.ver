"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getStudyGroupAggregation } from "@/lib/api/studySchedule"

declare global {
  interface Window {
    kakao: any
    onStudyMapMarkerClick?: (marker: { city: string; gu: string; dong: string }) => void
    studyMapMarkerClickHandlers?: { [key: string]: () => void }
  }
}

interface StudyGroupAggregation {
  studyGroupIds: number[]
  count: number
  address: {
    id: number
    city: string
    gu: string
    dong: string
  }
}

interface StudyMapData {
  calculatedStudyGroups: StudyGroupAggregation[]
}

export function useStudyMap(mapInstance: React.MutableRefObject<any>, isMapReady: boolean) {
  const [studyMarkers, setStudyMarkers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [isComposing, setIsComposing] = useState(false)
  const [inputError, setInputError] = useState("")
  const infoWindowInstance = useRef<any>(null)
  
  // 초기화 상태 관리
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  
  // 이벤트 리스너 등록 상태 추적
  const eventListenersRegistered = useRef(false)
  
  // ⚙️ 지도 업데이트 시간 설정 (필요 시 조정 가능)
  // 마지막 업데이트 시간 추적 (중복 업데이트 방지)
  const lastUpdateTime = useRef<number>(0)
  const UPDATE_COOLDOWN = 3000 // 3초 쿨다운 - 연속 업데이트 방지 최소 간격
  const DEBOUNCE_TIME = 2000 // 2초 디바운싱 - 지도 이동/줌 후 대기 시간 (더 길게 하면 업데이트 빈도 감소)
  const INITIAL_DELAY = 2000 // 2초 초기 지연 - 초기화 후 첫 업데이트까지 대기 시간

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback(() => {
    // 이미 초기화 중이거나 초기화된 경우 중복 실행 방지
    if (isInitializing || isInitialized) {
      console.log('📍 이미 초기화 중이거나 완료됨:', { isInitializing, isInitialized })
      return
    }
    
    console.log('📍 현재 위치 가져오기 시작')
    setIsInitializing(true)
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          console.log('📍 현재 위치 획득 성공:', { lat, lng })
          
          setCurrentLocation({ lat, lng })
          
          if (mapInstance.current) {
            mapInstance.current.setCenter(new window.kakao.maps.LatLng(lat, lng))
            mapInstance.current.setLevel(5) // 구 단위 레벨
            console.log('📍 지도 중심을 현재 위치로 이동')
          }
          
          setIsInitialized(true)
          setIsInitializing(false)
          
          setIsInitialized(true)
          setIsInitializing(false)
        },
        (error) => {
          console.log('📍 현재 위치 획득 실패, 기본 위치 사용:', error)
          // 기본 위치 (서울시청)
          const defaultLat = 37.5665
          const defaultLng = 126.9780
          setCurrentLocation({ lat: defaultLat, lng: defaultLng })
          
          if (mapInstance.current) {
            mapInstance.current.setCenter(new window.kakao.maps.LatLng(defaultLat, defaultLng))
            mapInstance.current.setLevel(5)
            console.log('📍 지도 중심을 기본 위치로 이동')
          }
          
          setIsInitialized(true)
          setIsInitializing(false)
        }
      )
    } else {
      console.log('📍 Geolocation API를 지원하지 않음, 기본 위치 사용')
      const defaultLat = 37.5665
      const defaultLng = 126.9780
      setCurrentLocation({ lat: defaultLat, lng: defaultLng })
      
      if (mapInstance.current) {
        mapInstance.current.setCenter(new window.kakao.maps.LatLng(defaultLat, defaultLng))
        mapInstance.current.setLevel(5)
      }
      
      setIsInitialized(true)
      setIsInitializing(false)
    }
  }, [mapInstance, isInitializing, isInitialized])

  // 주소로 좌표 변환
  const getCoordinatesFromAddress = useCallback(async (address: string) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      console.log('📍 카카오맵 서비스가 준비되지 않음')
      return null
    }

    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      const geocoder = new window.kakao.maps.services.Geocoder()
      
      console.log('📍 주소로 좌표 변환 API 요청:', address)
      
      geocoder.addressSearch(address, (result: any, status: any) => {
        console.log('📍 주소로 좌표 변환 API 응답:', { status, result })
        
        try {
          // result가 배열인지 확인
          const resultArray = Array.isArray(result) ? result : []
          
          if (status === window.kakao.maps.services.Status.OK && resultArray.length > 0) {
            const lat = parseFloat(resultArray[0]?.y || '0')
            const lng = parseFloat(resultArray[0]?.x || '0')
            
            if (lat !== 0 && lng !== 0) {
              console.log('📍 좌표 변환 성공:', { lat, lng })
              resolve({ lat, lng })
            } else {
              console.log('📍 유효하지 않은 좌표:', { lat, lng })
              resolve(null)
            }
          } else {
            console.log('📍 좌표 변환 실패:', { status, result: resultArray })
            resolve(null)
          }
        } catch (error) {
          console.error('📍 좌표 변환 중 에러 발생:', error)
          resolve(null)
        }
      })
    })
  }, [])

  // 좌표로 주소 변환
  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number) => {
    // 카카오맵 서비스 준비 여부 확인
    if (!window.kakao?.maps?.services) return null

    return new Promise<{ city: string; gu: string; dong: string } | null>((resolve) => {
      const geocoder = new window.kakao.maps.services.Geocoder()
      console.log('📍 좌표로 주소 변환 시작:', { lat, lng })

      // Kakao API 시그니처에 맞게 경도(lng), 위도(lat) 순서로 전달
      geocoder.coord2Address(
        lng, // 경도(x)
        lat, // 위도(y)
        (result: any, status: any) => {
          console.log('📍 좌표로 주소 변환 결과:', { status, result })
          try {
            if (status === window.kakao.maps.services.Status.OK && result?.length) {
              const address = result[0]?.address
              if (address) {
                const addressInfo = {
                  city: address.region_1depth_name || '',
                  gu: address.region_2depth_name || '',
                  dong: address.region_3depth_name || ''
                }
                console.log('📍 주소 변환 성공:', addressInfo)
                resolve(addressInfo)
              } else {
                console.log('📍 주소 정보가 없습니다.')
                resolve(null)
              }
            } else {
              console.log('📍 주소 변환 실패:', { status, result })
              resolve(null)
            }
          } catch (error) {
            console.error('📍 주소 변환 중 에러 발생:', error)
            resolve(null)
          }
        }
      )
    })
  }, [])

  // 스터디 그룹 집계 데이터 가져오기
  const fetchStudyGroupAggregation = useCallback(async (city: string, gu: string) => {
    try {
      setIsLoading(true)
      console.log('📊 스터디 그룹 집계 API 호출:', { city, gu })
      
      const response = await getStudyGroupAggregation(city, gu)
      console.log('📊 스터디 그룹 집계 API 응답:', response)
      
      if (response && response.result) {
        return response.result as StudyMapData
      } else {
        console.log('📊 스터디 그룹 집계 데이터가 없습니다.')
        return null
      }
    } catch (error) {
      console.error('📊 스터디 그룹 집계 조회 실패:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 각 동의 좌표 가져오기
  const getCoordinatesFromDong = useCallback(async (address: { city: string; gu: string; dong: string }) => {
    const fullAddress = `${address.city} ${address.gu} ${address.dong}`
    console.log('📍 동 좌표 조회:', fullAddress)
    
    const coordinates = await getCoordinatesFromAddress(fullAddress)
    if (coordinates) {
      console.log('📍 동 좌표 조회 성공:', coordinates)
      return coordinates
    }
    console.log('📍 동 좌표 조회 실패, 구 중심 좌표 사용')
    return null
  }, [getCoordinatesFromAddress])

  // 커스텀 마커 생성
const createCustomMarker = useCallback((position: any, groupData: StudyGroupAggregation) => {
  const markerId = `marker-${groupData.address.city}-${groupData.address.gu}-${groupData.address.dong}`

    // window에 핸들러 등록
    if (!window.studyMapMarkerClickHandlers) window.studyMapMarkerClickHandlers = {}
    window.studyMapMarkerClickHandlers[markerId] = () => {
      console.log('✅ 마커 핸들러 실행:', markerId)
      if (window.onStudyMapMarkerClick) {
        window.onStudyMapMarkerClick({
          city: groupData.address.city,
          gu: groupData.address.gu,
          dong: groupData.address.dong,
        })
      }
    }
    
    const markerContent = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
        cursor: pointer;
        transition: transform 0.2s;"
        onclick="window.studyMapMarkerClickHandlers['${markerId}']()"
        onmouseover="this.style.transform='scale(1.1)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <div style="text-align: center;">
          <div style="font-size: 16px; line-height: 1;">${groupData.count}</div>
          <div style="font-size: 10px; line-height: 1; opacity: 0.9;">개</div>
        </div>
      </div>
    `

    const customOverlay = new window.kakao.maps.CustomOverlay({
      position: position,
      content: markerContent,
      map: mapInstance.current,
      yAnchor: 1
    })

    // 마커에 데이터 저장 (전체 StudyGroupAggregation 정보 유지)
    customOverlay.groupData = groupData

    // 클릭 이벤트 추가
    window.kakao.maps.event.addListener(customOverlay, 'click', () => {
      // 인포윈도우 표시
      if (infoWindowInstance.current) {
        infoWindowInstance.current.close()
      }

      const infoContent = `
        <div style="padding: 15px; min-width: 200px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${groupData.address.dong}</div>
          <div style="color: #666; font-size: 14px;">스터디 그룹: ${groupData.count}개</div>
          <div style="margin-top: 8px; font-size: 12px; color: #888;">
            스터디 그룹 ID: ${groupData.studyGroupIds.join(', ')}
          </div>
          <div style="margin-top: 6px; font-size: 12px; color: #999;">
            ${groupData.address.city} ${groupData.address.gu} ${groupData.address.dong}
          </div>
        </div>
      `

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
        removable: true
      })

      infoWindow.open(mapInstance.current, position)
      infoWindowInstance.current = infoWindow
    })

    return customOverlay
  }, [mapInstance])

  // 지도 중심 변경 시 스터디 그룹 마커 업데이트
  const updateStudyMarkers = useCallback(async () => {
    console.log('🗺️ updateStudyMarkers 함수 호출됨')
    
    if (!mapInstance.current || !isMapReady || !isInitialized) {
      console.log('🗺️ 마커 업데이트 조건 불충족:', { 
        hasMap: !!mapInstance.current, 
        isMapReady, 
        isInitialized 
      })
      return
    }

    if (isLoading) {
      console.log('🗺️ 이미 로딩 중이므로 마커 업데이트 건너뜀')
      return
    }

    // 쿨다운 확인 (너무 자주 업데이트 방지)
    const currentTime = Date.now()
    if (currentTime - lastUpdateTime.current < UPDATE_COOLDOWN) {
      console.log('🗺️ 쿨다운 중이므로 마커 업데이트 건너뜀', {
        timeSinceLastUpdate: currentTime - lastUpdateTime.current,
        cooldown: UPDATE_COOLDOWN
      })
      return
    }

    lastUpdateTime.current = currentTime

    console.log('🗺️ 스터디 마커 업데이트 시작')

    try {
      // 기존 마커 제거 (studyMarkers 상태 대신 직접 제거)
      console.log('🗺️ 기존 마커 제거')
      setStudyMarkers(prevMarkers => {
        prevMarkers.forEach(marker => marker.setMap(null))
        return []
      })

      const center = mapInstance.current.getCenter()
      const lat = center.getLat()
      const lng = center.getLng()

      console.log('🗺️ 지도 중심 좌표:', { lat, lng })

      // 좌표를 주소로 변환
      console.log('🗺️ 주소 변환 시작...')
      const address = await getAddressFromCoordinates(lat, lng)
      if (!address) {
        console.log('🗺️ 주소 변환 실패로 마커 업데이트 중단')
        return
      }

      console.log('🗺️ 변환된 주소:', address)

      // 스터디 그룹 집계 데이터 가져오기
      console.log('🗺️ 스터디 그룹 집계 API 호출 시작...')
      const data = await fetchStudyGroupAggregation(address.city, address.gu)
      console.log('🗺️ 스터디 그룹 집계 API 응답:', data)
      
      if (!data || !data.calculatedStudyGroups) {
        console.log('🗺️ 스터디 그룹 데이터가 없어 마커를 생성하지 않습니다.')
        return
      }

      console.log('🗺️ 스터디 그룹 데이터:', data.calculatedStudyGroups)

      // 각 동별로 마커 생성
      console.log('🗺️ 마커 생성 시작...')
      const markers = await Promise.all(data.calculatedStudyGroups.map(async (group) => {
        // 각 동의 실제 좌표 가져오기
        const dongCoordinates = await getCoordinatesFromDong(group.address)
        
        // 동 좌표를 구하지 못한 경우 구 중심 좌표 사용
        const finalCoordinates = dongCoordinates || { lat, lng }
        const position = new window.kakao.maps.LatLng(finalCoordinates.lat, finalCoordinates.lng)
        
        console.log(`🗺️ ${group.address.dong} 마커 생성 - 좌표:`, finalCoordinates)
        return createCustomMarker(position, group)
      }))

      console.log('🗺️ 생성된 마커 수:', markers.length)
      setStudyMarkers(markers)
      console.log('🗺️ 마커 업데이트 완료')
    } catch (error) {
      console.error('🗺️ 마커 업데이트 중 오류 발생:', error)
    }
  }, [mapInstance, isMapReady, isInitialized, isLoading, getAddressFromCoordinates, fetchStudyGroupAggregation, createCustomMarker, getCoordinatesFromDong])

  // 지도 이벤트 리스너 등록
  useEffect(() => {
    console.log('🗺️ 지도 이벤트 리스너 등록 시도:', { 
      hasMap: !!mapInstance.current, 
      isMapReady, 
      isInitialized,
      alreadyRegistered: eventListenersRegistered.current
    })
    
    if (!mapInstance.current || !isMapReady || !isInitialized) {
      console.log('🗺️ 지도 이벤트 리스너 등록 실패: 조건 불충족')
      return
    }

    // 이미 등록된 경우 중복 등록 방지
    if (eventListenersRegistered.current) {
      console.log('🗺️ 이미 이벤트 리스너가 등록되어 있음')
      return
    }

    console.log('🗺️ 지도 이벤트 리스너 등록 시작')

    const map = mapInstance.current
    let updateTimeout: NodeJS.Timeout | null = null

    const onDragEnd = () => {
      console.log('🗺️ 지도 드래그 완료 - 이벤트 발생!')
      
      // 이전 타임아웃 취소
      if (updateTimeout) {
        clearTimeout(updateTimeout)
        console.log('🗺️ 이전 타임아웃 취소')
      }
      
      updateTimeout = setTimeout(() => {
        console.log('🗺️ 드래그 후 마커 업데이트 실행')
        try {
          updateStudyMarkers()
        } catch (error) {
          console.error('🗺️ 드래그 후 마커 업데이트 실패:', error)
        }
      }, DEBOUNCE_TIME) // 드래그 완료 후 설정된 시간 뒤 업데이트
    }
    
    const onZoomChanged = () => {
      console.log('🗺️ 지도 줌 변경 - 이벤트 발생!')
      
      // 이전 타임아웃 취소
      if (updateTimeout) {
        clearTimeout(updateTimeout)
        console.log('🗺️ 이전 타임아웃 취소')
      }
      
      updateTimeout = setTimeout(() => {
        console.log('🗺️ 줌 변경 후 마커 업데이트 실행')
        try {
          updateStudyMarkers()
        } catch (error) {
          console.error('🗺️ 줌 변경 후 마커 업데이트 실패:', error)
        }
      }, DEBOUNCE_TIME) // 줌 변경 후 설정된 시간 뒤 업데이트
    }

    // 이벤트 리스너 등록
    window.kakao.maps.event.addListener(map, "dragend", onDragEnd)
    window.kakao.maps.event.addListener(map, "zoom_changed", onZoomChanged)
    
    eventListenersRegistered.current = true

    console.log('🗺️ 지도 이벤트 리스너 등록 완료')

    return () => {
      console.log('🗺️ 지도 이벤트 리스너 제거')
      eventListenersRegistered.current = false
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      window.kakao.maps.event.removeListener(map, "dragend", onDragEnd)
      window.kakao.maps.event.removeListener(map, "zoom_changed", onZoomChanged)
    }
  }, [mapInstance, isMapReady, isInitialized, updateStudyMarkers])

  // 초기화 완료 후 마커 업데이트
  useEffect(() => {
    if (isInitialized && !isInitializing && mapInstance.current && isMapReady) {
      console.log('📍 초기화 완료 감지, 마커 업데이트 실행')
      
      // 한 번만 실행되도록 setTimeout 사용
      const timeoutId = setTimeout(() => {
        console.log('📍 초기화 완료 후 마커 업데이트 실행')
        updateStudyMarkers()
      }, INITIAL_DELAY) // 초기화 후 설정된 시간 뒤 업데이트
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [isInitialized, isInitializing, mapInstance, isMapReady]) // updateStudyMarkers 제거로 무한 루프 방지

  // 검색 자동완성
  useEffect(() => {
    if (!isMapReady || searchInput.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/kakao/search?endpoint=keyword.json&query=${encodeURIComponent(searchInput)}`
        )
        const data = await response.json()
        
        if (data.documents && data.documents.length > 0) {
          setSuggestions(data.documents.slice(0, 5))
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch (error) {
        console.error('검색 자동완성 실패:', error)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchInput, isMapReady])

  // 검색 실행
  const handleSearch = useCallback(async (query?: string) => {
    const searchQuery = query || searchInput.trim()
    if (searchQuery.length < 2) {
      setInputError("2글자 이상 입력해 주세요.")
      return
    }

    setInputError("")
    setShowSuggestions(false)

    // 주소로 좌표 변환
    const coordinates = await getCoordinatesFromAddress(searchQuery)
    if (!coordinates) {
      setInputError("해당 위치를 찾을 수 없습니다.")
      return
    }

    // 지도 이동
    if (mapInstance.current) {
      mapInstance.current.setCenter(new window.kakao.maps.LatLng(coordinates.lat, coordinates.lng))
      mapInstance.current.setLevel(5)
    }
  }, [searchInput, mapInstance, getCoordinatesFromAddress])

  // 추천 항목 클릭
  const handleSuggestionClick = useCallback((suggestion: any) => {
    setSearchInput(suggestion.place_name)
    setShowSuggestions(false)
    handleSearch(suggestion.place_name)
  }, [handleSearch])

  // 키보드 이벤트 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault()
      handleSearch()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlighted(-1)
    }
  }, [isComposing, handleSearch, suggestions.length])

  return {
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
    isInitialized,
    isInitializing,
    getCurrentLocation,
    handleSearch,
    handleSuggestionClick,
    handleKeyDown,
    updateStudyMarkers,
    // 디버깅용 함수
    testUpdateMarkers: () => {
      console.log('🧪 테스트 마커 업데이트 실행')
      updateStudyMarkers()
    }
  }
} 