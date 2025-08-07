"use client"

import { useState, useEffect, useRef } from "react"

declare global {
  interface Window {
    kakao: any
  }
}

// 기본 장소 검색 훅 (공통 기능)
export function usePlaceSearch(
  mapInstance: React.MutableRefObject<any>,
  isMapReady: boolean,
  isMapLoading: boolean,
  setShowSuggestions?: (show: boolean) => void, // 인자 추가
  myLocation?: { lat: number; lng: number } | null // 내 위치 추가
) {
  const [searchInput, setSearchInput] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestionsState, _setShowSuggestions] = useState(false)
  const showSuggestions = showSuggestionsState
  const setShowSuggestionsSafe = setShowSuggestions ?? _setShowSuggestions
  const [highlighted, setHighlighted] = useState(-1)
  const [isComposing, setIsComposing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inputError, setInputError] = useState("")
  const [placeMarkers, setPlaceMarkers] = useState<any[]>([])
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [isLocationMoved, setIsLocationMoved] = useState(false)
  const [justMovedOnly, setJustMovedOnly] = useState(false)
  const infoWindowInstance = useRef<any>(null)
  const [centerLatLng, setCenterLatLng] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [lastMovedPlaceName, setLastMovedPlaceName] = useState("")
  const [regionPolygon, setRegionPolygon] = useState<any>(null)
  const [isRegion, setIsRegion] = useState(false)

  // 지도 이동 이벤트 리스너 등록
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const closeSuggestions = () => setShowSuggestionsSafe(false);
    window.kakao.maps.event.addListener(map, "dragstart", closeSuggestions);
    window.kakao.maps.event.addListener(map, "dragend", closeSuggestions);
    window.kakao.maps.event.addListener(map, "zoom_changed", closeSuggestions);
    return () => {
      window.kakao.maps.event.removeListener(map, "dragstart", closeSuggestions);
      window.kakao.maps.event.removeListener(map, "dragend", closeSuggestions);
      window.kakao.maps.event.removeListener(map, "zoom_changed", closeSuggestions);
    };
  }, [mapInstance, setShowSuggestionsSafe]);

  // 입력값에 따라 지역명인지 아닌지 판별
  useEffect(() => {
    const check = async () => {
      const isRegionResult = await checkIfRegionName(searchInput)
      setIsRegion(isRegionResult)
    }
    if (searchInput.trim().length > 1) {
      check()
    } else {
      setIsRegion(false)
    }
  }, [searchInput])

  // 자동완성: 장소명 부분만
  useEffect(() => {
    if (!isMapReady || isMapLoading) return
    const controller = new AbortController()
    const [locationPart] = searchInput.trim().split(/\s+/)
    if (!locationPart || locationPart.length < 2) {
      setSuggestions([])
      setShowSuggestionsSafe(false)
      return
    }
    const timeout = setTimeout(() => {
      fetch(
        `/api/kakao/search?endpoint=keyword.json&query=${encodeURIComponent(
          locationPart
        )}`
      )
        .then(res => res.json())
        .then(data => {
          if (data.documents && data.documents.length > 0) {
            setSuggestions(data.documents.slice(0, 8))
            setShowSuggestionsSafe(true)
          } else {
            setSuggestions([])
            setShowSuggestionsSafe(false)
          }
        })
        .catch(() => {})
    }, 200)
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [searchInput, isMapReady, isMapLoading])

  // 지역명 판별 함수 (Kakao API 사용)
  async function checkIfRegionName(keyword: string): Promise<boolean> {
    const trimmed = keyword.trim()
    if (
      trimmed.endsWith("역") ||
      trimmed.endsWith("타워") ||
      trimmed.endsWith("빌딩") ||
      trimmed.endsWith("아파트")
    ) {
      return false
    }

    try {
      const response = await fetch(
        `/api/kakao/search?endpoint=address.json&query=${encodeURIComponent(
          trimmed
        )}&size=1`
      )

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      if (data.documents && data.documents.length > 0) {
        const result = data.documents[0]
        if (result.address_type === "REGION") {
          return true
        }
      }
      return false
    } catch (error) {
      console.error("Error checking region name with Kakao API:", error)
      return false
    }
  }

  // 통합 검색 실행
  const handleUnifiedSearch = async (input?: string, suggestionPlace?: any) => {
    setShowSuggestionsSafe(false); // 무조건 가장 먼저!
    const value = (input ?? searchInput).trim();
    if (value.length < 2) {
      setInputError("2글자 이상 입력해 주세요.");
      return;
    }
    setInputError("");
    // 카테고리만 입력(공백 없는 한 단어, 예: '카페')일 때는 현재 지도 중심 기준으로만 검색, 중심 이동 X
    const categories = [
      "음식점", "카페", "편의점", "주차장", "주유소", "약국", "마트", "은행", "술집", "스터디카페"
    ];
    if (categories.includes(value) && value.split(/\s+/).length === 1) {
      setSelectedPlace(null); // 카테고리 검색 시 단일 마커/선택 해제
      let center = null;
      if (myLocation) {
        center = myLocation;
      } else if (mapInstance.current) {
        const c = mapInstance.current.getCenter();
        center = { lat: c.getLat(), lng: c.getLng() };
      }
      if (center) {
        searchNearbyPlaces(value, true, { lat: center.lat, lng: center.lng }, true);
      }
      return;
    }
    // 지역명만 입력(공백 없는 한 단어)일 때만 Polygon 표시/중심 이동
    const isOnlyRegion =
      (await checkIfRegionName(value)) && value.split(/\s+/).length === 1
    if (isOnlyRegion) {
      // 기존 마커/인포윈도우/검색 결과 제거
      setPlaceMarkers([])
      setSelectedPlace(null)
      setInputError("")
      setLastMovedPlaceName("")
      // 기존 Polygon 제거
      if (regionPolygon) {
        regionPolygon.setMap(null)
        setRegionPolygon(null)
      }
      // Polygon 표시 또는 중심 이동
      if (
        window.kakao &&
        window.kakao.maps &&
        window.kakao.maps.services
      ) {
        const geocoder = new window.kakao.maps.services.Geocoder()
        geocoder.addressSearch(value, (result: any[], status: string) => {
          if (
            status === window.kakao.maps.services.Status.OK &&
            result.length > 0
          ) {
            const lat = parseFloat(result[0].y)
            const lng = parseFloat(result[0].x)
            // 행정구역 경계 검색 (Polygon)
            if (
              window.kakao.maps.services &&
              window.kakao.maps.services.Polygon
            ) {
              // Polygon API가 있으면 사용 (최신 SDK)
              const polygonService = new window.kakao.maps.services.Polygon()
              polygonService.search(
                value,
                (polygonResult: any[], polygonStatus: string) => {
                  if (
                    polygonStatus === window.kakao.maps.services.Status.OK &&
                    polygonResult.length > 0
                  ) {
                    const path = polygonResult[0].polygon[0].map(
                      (coord: any) =>
                        new window.kakao.maps.LatLng(coord.y, coord.x)
                    )
                    const polygon = new window.kakao.maps.Polygon({
                      path,
                      strokeWeight: 3,
                      strokeColor: "#FF00FF",
                      fillColor: "#FF00FF",
                      fillOpacity: 0.15,
                    })
                    polygon.setMap(mapInstance.current)
                    setRegionPolygon(polygon)
                    // bounds 맞추기
                    const bounds = new window.kakao.maps.LatLngBounds()
                    path.forEach((latlng: any) => bounds.extend(latlng))
                    mapInstance.current.setBounds(bounds)
                  } else {
                    // Polygon API 실패 시 중심 좌표만 이동
                    mapInstance.current.setCenter(
                      new window.kakao.maps.LatLng(lat, lng)
                    )
                    setInputError(
                      "이 지역의 경계는 카카오 지도에서 지원하지 않습니다."
                    )
                  }
                }
              )
            } else {
              // Polygon API가 없으면 중심 좌표만 이동 + 안내
              mapInstance.current.setCenter(
                new window.kakao.maps.LatLng(lat, lng)
              )
              setInputError(
                "이 지역의 경계는 카카오 지도에서 지원하지 않습니다."
              )
            }
          } else {
            setInputError("지역을 찾을 수 없습니다.")
          }
        })
      }
      return
    }
    // 장소명, 카테고리 분리
    const parts = value.split(/\s+/)
    // 1. 장소명+카테고리 (2단어 이상)
    if (parts.length >= 2) {
      // 1) 전체 입력값으로 장소 이동 시도
      let lat: number | null = null,
        lng: number | null = null
      let found = false
      const fullQuery = value
      const resFull = await fetch(
        `/api/kakao/search?endpoint=keyword.json&query=${encodeURIComponent(
          fullQuery
        )}`
      )
      const dataFull = await resFull.json()
      if (dataFull.documents && dataFull.documents.length > 0) {
        lat = parseFloat(dataFull.documents[0].y)
        lng = parseFloat(dataFull.documents[0].x)
        found = true
      }
      if (found && lat !== null && lng !== null && mapInstance.current) {
        const moveLatLng = new window.kakao.maps.LatLng(lat, lng)
        mapInstance.current.setCenter(moveLatLng)
        setCenterLatLng({ lat, lng })
        setIsLocationMoved(true)
        setPlaceMarkers([])
        setSelectedPlace(null)
        setInputError("")
        setJustMovedOnly(true)
        // setCenter 후 카테고리로 주변 검색
        // 카테고리로 주변 검색
        const categoryPart = suggestionPlace
          ? parts.slice(1).join(" ")
          : parts.slice(1).join(" ")
        if (categoryPart.length >= 2) {
          // setTimeout으로 setCenter 이후에 searchNearbyPlaces가 실행되도록 보장
          setTimeout(() => {
            if (lat !== null && lng !== null) {
              searchNearbyPlaces(categoryPart, true, { lat, lng })
            }
          }, 200)
        }
        return
      }
      // 2) 기존 로직: 첫 단어로 이동, 두 번째 단어로 주변 검색
      const locationPart = suggestionPlace
        ? suggestionPlace.place_name
        : parts[0]
      const categoryPart = suggestionPlace
        ? parts.slice(1).join(" ")
        : parts.slice(1).join(" ")
      lat = null
      lng = null
      if (suggestionPlace) {
        lat = parseFloat(suggestionPlace.y)
        lng = parseFloat(suggestionPlace.x)
      } else if (suggestions.length > 0) {
        const exact = suggestions.find(s => s.place_name === locationPart)
        if (exact) {
          lat = parseFloat(exact.y)
          lng = parseFloat(exact.x)
        } else {
          lat = parseFloat(suggestions[0].y)
          lng = parseFloat(suggestions[0].x)
        }
      } else {
        const res = await fetch(
          `/api/kakao/search?endpoint=keyword.json&query=${encodeURIComponent(
            locationPart
          )}`
        )
        const data = await res.json()
        if (data.documents && data.documents.length > 0) {
          lat = parseFloat(data.documents[0].y)
          lng = parseFloat(data.documents[0].x)
        }
      }
      if (lat && lng && mapInstance.current) {
        const moveLatLng = new window.kakao.maps.LatLng(lat, lng)
        mapInstance.current.setCenter(moveLatLng)
        setCenterLatLng({ lat, lng })
        setIsLocationMoved(true)
        setPlaceMarkers([])
        setSelectedPlace(null)
        // 카테고리로 주변 검색
        if (categoryPart.length >= 2)
          searchNearbyPlaces(categoryPart, true, { lat, lng })
      }
      return
    } else if (parts.length === 1) {
      // 장소명만 입력: 지도만 이동, 주변 장소 검색 X, 마커 생성 X
      const locationPart = suggestionPlace
        ? suggestionPlace.place_name
        : parts[0]
      let lat: number | null = null,
        lng: number | null = null
      if (suggestionPlace) {
        lat = parseFloat(suggestionPlace.y)
        lng = parseFloat(suggestionPlace.x)
      } else if (suggestions.length > 0) {
        const exact = suggestions.find(s => s.place_name === locationPart)
        if (exact) {
          lat = parseFloat(exact.y)
          lng = parseFloat(exact.x)
        } else {
          lat = parseFloat(suggestions[0].y)
          lng = parseFloat(suggestions[0].x)
        }
      } else {
        const res = await fetch(
          `/api/kakao/search?endpoint=keyword.json&query=${encodeURIComponent(
            locationPart
          )}`
        )
        const data = await res.json()
        if (data.documents && data.documents.length > 0) {
          lat = parseFloat(data.documents[0].y)
          lng = parseFloat(data.documents[0].x)
        }
      }
      if (lat && lng && mapInstance.current) {
        // 카테고리(공백 없는 한 단어)가 아니라 장소명만 입력일 때만 setCenter
        if (!isCategoryKeyword(locationPart)) {
          const moveLatLng = new window.kakao.maps.LatLng(lat, lng)
          mapInstance.current.setCenter(moveLatLng)
          setCenterLatLng({ lat, lng })
          setIsLocationMoved(true)
          // 기존 마커/오류 제거
          setPlaceMarkers([])
          setSelectedPlace(null)
          setInputError("")
          setLastMovedPlaceName(locationPart)
        }
        // 카테고리만 입력 시에는 setCenter 호출하지 않음
      }
      return
    }
  }

  // 카테고리 키워드 판별 함수
  function isCategoryKeyword(keyword: string) {
    const categories = [
      "음식점",
      "카페",
      "편의점",
      "주차장",
      "주유소",
      "약국",
      "마트",
      "은행",
      "술집",
    ]
    return categories.includes(keyword.trim())
  }

  // 추천 클릭
  const handleSuggestionClick = (place: any) => {
    handleUnifiedSearch(searchInput, place)
    setShowSuggestionsSafe(false)
    setHighlighted(-1)
  }

  // 엔터/키보드
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing) {
      setShowSuggestionsSafe(false); // 엔터 시 드롭다운 닫기
      if (showSuggestions && suggestions.length > 0) {
        const idx = highlighted === -1 ? 0 : highlighted
        setHighlighted(-1)
        ;(e.target as HTMLInputElement).blur()
        // 정확히 일치하는 장소 우선
        const [locationPart] = searchInput.trim().split(/\s+/)
        const exact = suggestions.find(s => s.place_name === locationPart)
        if (exact) {
          handleUnifiedSearch(searchInput, exact)
        } else {
          handleUnifiedSearch(searchInput, suggestions[idx])
        }
        setHighlighted(-1)
        return
      }
      if (showSuggestions && highlighted >= 0 && suggestions[highlighted]) {
        handleUnifiedSearch(searchInput, suggestions[highlighted])
        setHighlighted(-1)
      } else if (showSuggestions && suggestions.length > 0) {
        // 입력값과 정확히 일치하는 지하철역 우선
        const [locationPart] = searchInput.trim().split(/\s+/)
        const exactSubway = suggestions.find(
          s =>
            s.place_name === locationPart &&
            s.category_name &&
            s.category_name.includes("지하철역")
        )
        if (exactSubway) {
          handleUnifiedSearch(searchInput, exactSubway)
        } else {
          const exact = suggestions.find(s => s.place_name === locationPart)
          if (exact) {
            handleUnifiedSearch(searchInput, exact)
          } else {
            handleUnifiedSearch(searchInput, suggestions[0])
          }
        }
        setHighlighted(-1)
      } else {
        handleUnifiedSearch()
        setHighlighted(-1)
      }
      return
    } else if (e.key === "ArrowDown") {
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === "Escape") {
      setShowSuggestionsSafe(false)
      setHighlighted(-1)
    }
  }

  // 주변 장소 검색 (지도 중심 기준, 장소 이동 후에만 마커 표시)
  const searchNearbyPlaces = async (
    keyword: string,
    adjustBounds = false,
    customCenter?: { lat: number; lng: number } | null,
    preventMapMove: boolean = false
  ) => {
    if (
      !window.kakao ||
      !window.kakao.maps ||
      !keyword.trim() ||
      !isMapReady ||
      !mapInstance.current ||
      isLoading
    )
      return
    if (keyword.trim().length < 2) {
      setInputError("2글자 이상 입력해 주세요.")
      return
    } else {
      setInputError("")
    }
    setIsLoading(true)
    if (placeMarkers.length > 0) {
      placeMarkers.forEach((m: any) => m.marker.setMap(null))
    }
    setPlaceMarkers([])
    setSelectedPlace(null)
    let allPlaces: any[] = []
    // 카테고리 코드 분기
    let categoryCode = ""
    const trimmed = keyword.trim()
    if (trimmed === "음식점") categoryCode = "FD6"
    if (trimmed === "카페") categoryCode = "CE7"
    if (trimmed === "편의점") categoryCode = "CS2"
    if (trimmed === "주차장") categoryCode = "PK6"
    if (trimmed === "주유소") categoryCode = "OL7"
    if (trimmed === "약국") categoryCode = "PM9"
    if (trimmed === "마트") categoryCode = "MT1"
    if (trimmed === "은행") categoryCode = "BK9"
    const isBar = trimmed === "술집"
    if (isBar) categoryCode = "FD6"
    // 중심 좌표 결정
    let lat: number, lng: number
    if (
      customCenter &&
      typeof customCenter.lat === "number" &&
      typeof customCenter.lng === "number"
    ) {
      lat = customCenter.lat
      lng = customCenter.lng
    } else if (mapInstance.current) {
      const center = mapInstance.current.getCenter()
      lat = center.getLat()
      lng = center.getLng()
    } else {
      alert("지도의 중심 좌표를 알 수 없습니다.")
      setIsLoading(false)
      return
    }
    // 거리 계산 함수
    function getDistance(
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number
    ) {
      const R = 6371e3 // meters
      const φ1 = (lat1 * Math.PI) / 180
      const φ2 = (lat2 * Math.PI) / 180
      const Δφ = (lat2 - lat1) * Math.PI / 180
      const Δλ = (lng2 - lng1) * Math.PI / 180
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) *
          Math.cos(φ2) *
          Math.sin(Δλ / 2) *
          Math.sin(Δλ / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }
    try {
      for (let page = 1; page <= 3; page++) {
        const url =
          `/api/kakao/search?endpoint=keyword.json&query=${encodeURIComponent(
            keyword
          )}&x=${lng}&y=${lat}&radius=1000&page=${page}` +
          (categoryCode ? `&category_group_code=${categoryCode}` : "")
        const res = await fetch(url)
        if (!res.ok) {
          throw new Error("API요청 실패 : ${res.status} ${res.statusText}")
        }
        const data = await res.json()
        if (data.documents && data.documents.length > 0) {
          allPlaces = allPlaces.concat(data.documents)
          if (!data.meta.is_end) continue
          else break
        } else {
          break
        }
      }
      let uniquePlaces = allPlaces.filter(
        (place, idx, arr) =>
          arr.findIndex(p => p.x === place.x && p.y === place.y) === idx
      )
      // 중심에서 1km 이내만 남김
      uniquePlaces = uniquePlaces.filter(
        (place: any) =>
          getDistance(lat, lng, parseFloat(place.y), parseFloat(place.x)) <=
          1000
      )
      if (isBar) {
        uniquePlaces = uniquePlaces.filter(
          (place: any) =>
            (place.place_name && /술집|호프|바/i.test(place.place_name)) ||
            (place.category_name && /술집|호프|바/i.test(place.category_name))
        )
      }
      if (uniquePlaces.length > 0) {
        const markers = uniquePlaces.map((place: any) => {
          const marker = new window.kakao.maps.Marker({
            map: mapInstance.current,
            position: new window.kakao.maps.LatLng(
              parseFloat(place.y),
              parseFloat(place.x)
            ),
            title: place.place_name,
          })
          window.kakao.maps.event.addListener(marker, "click", () => {
            setSelectedPlace(place)
            mapInstance.current.setCenter(
              new window.kakao.maps.LatLng(
                parseFloat(place.y),
                parseFloat(place.x)
              )
            )
          })
          return { marker, place }
        })
        setPlaceMarkers(markers)
        if (!preventMapMove) {
          // setBounds는 마커가 2개 이상이고 모두 1km 이내일 때만 사용
          if (markers.length > 1) {
            // 모든 마커가 중심에서 1km 이내인지 확인
            const allWithin1km = markers.every(
              (m: any) =>
                getDistance(
                  lat,
                  lng,
                  m.marker.getPosition().getLat(),
                  m.marker.getPosition().getLng()
                ) <= 1000
            )
            if (adjustBounds && allWithin1km) {
              const bounds = new window.kakao.maps.LatLngBounds()
              markers.forEach((m: any) => bounds.extend(m.marker.getPosition()))
              mapInstance.current.setBounds(bounds)
            } else {
              // 중심 좌표로만 이동
              mapInstance.current.setCenter(
                new window.kakao.maps.LatLng(lat, lng)
              )
            }
          } else if (markers.length === 1) {
            // 마커가 1개면 중심 좌표로 이동
            mapInstance.current.setCenter(
              new window.kakao.maps.LatLng(lat, lng)
            )
          }
        }
      } else {
        setInputError(
          "주변에서 장소를 찾을 수 없습니다. 다른 키워드로 시도해보세요."
        )
      }
    } catch (e) {
      setInputError("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  // 입력값이 바뀔 때마다 장소 이동 없이 주변 장소만 검색(카테고리만 입력 시)
  useEffect(() => {
    if (isMapReady && mapInstance.current && searchInput.trim().length >= 2 && !isLoading) {
      const parts = searchInput.trim().split(/\s+/)
      // 카테고리만 입력(공백 없는 한 단어, 카테고리 키워드)일 때만
      if (parts.length === 1 && isCategoryKeyword(parts[0])) {
        const center = mapInstance.current.getCenter()
        searchNearbyPlaces(
          parts[0],
          true,
          { lat: center.getLat(), lng: center.getLng() },
          true
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, isComposing, isMapReady, justMovedOnly])

  // 인포윈도우 표시 (기존과 동일)
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps || !selectedPlace) return
    // 기존 인포윈도우 닫기
    if (infoWindowInstance.current) {
      infoWindowInstance.current.close()
      infoWindowInstance.current = null
    }
    let content = `<div style='padding:18px 24px 18px 18px; min-width:240px; max-width:340px; font-size:17px; color:#222; font-weight:600;'>`
    content += selectedPlace.place_name
      ? `<div style='font-size:18px; font-weight:700;'>${selectedPlace.place_name}</div>`
      : ""
    content += selectedPlace.road_address_name
      ? `<div style='font-size:15px; color:#444; margin-top:6px;'>${selectedPlace.road_address_name}</div>`
      : ""
    content +=
      selectedPlace.address_name && !selectedPlace.road_address_name
        ? `<div style='font-size:15px; color:#444; margin-top:6px;'>${selectedPlace.address_name}</div>`
        : ""
    if (selectedPlace.phone) {
      content += `<div style='font-size:14px; color:#666; margin-top:6px;'>전화번호: ${selectedPlace.phone}</div>`
    }
    if (selectedPlace.opening_hours) {
      content += `<div style='font-size:14px; color:#666; margin-top:6px;'>영업시간: ${selectedPlace.opening_hours}</div>`
    } else if (selectedPlace.bizhour_info) {
      content += `<div style='font-size:14px; color:#666; margin-top:6px;'>영업시간: ${selectedPlace.bizhour_info}</div>`
    } else if (selectedPlace.hours) {
      content += `<div style='font-size:14px; color:#666; margin-top:6px;'>영업시간: ${selectedPlace.hours}</div>`
    }
    content += `</div>`
    const iw = new window.kakao.maps.InfoWindow({
      content,
      removable: true,
    })
    // 해당 마커 위에 표시
    const markerObj = placeMarkers.find(m => m.place.id === selectedPlace.id)
    if (markerObj) {
      iw.open(mapInstance.current, markerObj.marker)
      infoWindowInstance.current = iw
      // 인포윈도우 닫기 이벤트에서 selectedPlace를 null로 만드는 코드가 있다면 제거!
      // (아무것도 하지 않음)
    }
  }, [selectedPlace, placeMarkers, mapInstance])

  // Polygon 상태 정리: 장소/카테고리 검색 시 기존 Polygon 제거
  useEffect(() => {
    if (regionPolygon && !isRegion) {
      regionPolygon.setMap(null)
      setRegionPolygon(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegion, regionPolygon])

  return {
    searchInput,
    setSearchInput,
    suggestions,
    showSuggestions,
    setShowSuggestions: setShowSuggestionsSafe,
    highlighted,
    setHighlighted,
    isComposing,
    setIsComposing,
    inputError,
    setInputError,
    placeMarkers,
    selectedPlace,
    handleSuggestionClick,
    handleKeyDown,
    handleUnifiedSearch,
  }
}

// 스터디 일정 추가용 간단한 검색 훅
export function useSchedulePlaceSearch(
  mapInstance: React.MutableRefObject<any>,
  isMapReady: boolean,
  isMapLoading: boolean
) {
  const baseSearch = usePlaceSearch(mapInstance, isMapReady, isMapLoading)
  
  // 스터디 일정 추가에 필요한 추가 기능들
  const [selectedSchedulePlace, setSelectedSchedulePlace] = useState<any>(null)
  
  // 장소 선택 시 단순화된 처리
  const handleSchedulePlaceSelect = (place: any) => {
    setSelectedSchedulePlace(place)
    // 지도 중심 이동
    if (mapInstance.current && place) {
      mapInstance.current.setCenter(
        new window.kakao.maps.LatLng(place.y, place.x)
      )
    }
  }
  
  return {
    ...baseSearch,
    selectedSchedulePlace,
    handleSchedulePlaceSelect,
    setSelectedSchedulePlace
  }
}

// 모임장소 페이지용 고급 검색 훅
export function usePlacePageSearch(
  mapInstance: React.MutableRefObject<any>,
  isMapReady: boolean,
  isMapLoading: boolean
) {
  const baseSearch = usePlaceSearch(mapInstance, isMapReady, isMapLoading)
  
  // 모임장소 페이지에 필요한 추가 기능들
  const [cafeList, setCafeList] = useState<any[]>([])
  const [selectedCafe, setSelectedCafe] = useState<any>(null)
  
  // 카페 목록 검색 및 필터링
  const searchCafes = async (keyword: string, filters?: any) => {
    // 카페 전용 검색 로직
    // 별점순 정렬, 리뷰 수 필터링 등
  }
  
  // 카페 선택 시 상세 정보 표시
  const selectCafe = (cafe: any) => {
    setSelectedCafe(cafe)
  }
  
  return {
    ...baseSearch,
    cafeList,
    selectedCafe,
    searchCafes,
    selectCafe
  }
} 