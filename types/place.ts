export interface PlaceInfo {
  id: string
  name: string
  location: string
  locationPoint: {
    getY: () => number // 위도
    getX: () => number // 경도
  }
  phone?: string
  placeUrl?: string
  rating?: number
  reviewCount?: number
  specificAddressId: string
}

export interface PlaceSearchParams {
  specificAddressId: string
  sortBy?: 'rating' | 'reviewCount'
  page?: number
  size?: number
}

export interface PlaceSearchResponse {
  result: {
    places: PlaceInfo[]
    totalCount: number
    hasNext: boolean
    nextCursor?: string
  }
  success: boolean
  message: string
} 