"use client"

import { useState, useEffect, useRef } from "react"

declare global {
  interface Window {
    kakao: any
  }
}

const KAKAO_JAVASCRIPT_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
console.log('KAKAO_JAVASCRIPT_KEY:', KAKAO_JAVASCRIPT_KEY)

export function useKakaoMap(mapContainerRef: React.RefObject<HTMLDivElement | null>) {
  const [isMapReady, setIsMapReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const mapInstance = useRef<any>(null)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const scriptId = "kakao-map-script"
    
    const initMap = () => {
      window.kakao.maps.load(() => {
        let lat = 37.5665
        let lng = 126.9780

        const createMap = (lat: number, lng: number) => {
          if (!mapContainerRef.current) return
          
          const map = new window.kakao.maps.Map(mapContainerRef.current, {
            center: new window.kakao.maps.LatLng(lat, lng),
            level: 3,
          })
          
          mapInstance.current = map
          setIsMapReady(true)
          setIsLoading(false)
          setMyLocation({ lat, lng })
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
  }, [mapContainerRef])

  return { mapInstance, isMapReady, isLoading, myLocation }
} 