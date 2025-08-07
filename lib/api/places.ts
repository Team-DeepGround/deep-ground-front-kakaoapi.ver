import { apiClient } from '@/lib/api-client'

export interface CafeData {
  id: number
  name: string
  latitude: number
  longitude: number
  rating: number
  reviewCount: number
  address: string
  phone?: string
  hours?: string
  description?: string
}

export interface ReviewData {
  communityPlaceReviewId: number
  scope: number
  content: string
  mediaUrl: string[]
}

export interface ReviewListResponse {
  success: boolean
  data?: {
    reviews: ReviewData[]
    totalPages: number
  }
  message: string
  code?: string
  result?: {
    reviews: ReviewData[]
    totalPages: number
  }
  reviews?: ReviewData[]
  totalPages?: number
}

export interface CafeListResponse {
  success: boolean
  data: CafeData[]
  pagination: {
    page: number
    size: number
    total: number
    totalPages: number
  }
  filters: {
    sortBy: string
    minRating: number
    maxRating: number
  }
}

export interface CafeListParams {
  sortBy?: 'rating' | 'reviewCount'
  page?: number
  size?: number
  minRating?: number
  maxRating?: number
}

// 카페 목록 조회 (특정 주소 ID로 조회)
export async function getCafeList(specificAddressId: string, params: CafeListParams = {}): Promise<CafeListResponse> {
  const searchParams = new URLSearchParams()
  
  if (params.sortBy) searchParams.append('sortBy', params.sortBy)
  if (params.page) searchParams.append('page', params.page.toString())
  if (params.size) searchParams.append('size', params.size.toString())
  if (params.minRating) searchParams.append('minRating', params.minRating.toString())
  if (params.maxRating) searchParams.append('maxRating', params.maxRating.toString())

  return apiClient(`/communityPlace/${specificAddressId}?${searchParams.toString()}`)
}

// 특정 카페 조회
export async function getCafeById(id: number): Promise<{ success: boolean; data: CafeData }> {
  return apiClient(`/places/cafes/${id}`)
}

// 새로운 카페 추가
export async function createCafe(cafeData: Omit<CafeData, 'id'>): Promise<{ success: boolean; data: CafeData; message: string }> {
  return apiClient('/places/cafes', {
    method: 'POST',
    body: JSON.stringify(cafeData)
  })
}

// 카페 정보 수정
export async function updateCafe(id: number, cafeData: Partial<CafeData>): Promise<{ success: boolean; data: CafeData; message: string }> {
  return apiClient(`/places/cafes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cafeData)
  })
}

// 카페 삭제
export async function deleteCafe(id: number): Promise<{ success: boolean; message: string }> {
  return apiClient(`/places/cafes/${id}`, {
    method: 'DELETE'
  })
} 

// 카페 리뷰 조회
export async function getCafeReviews(specificAddressId: number, page: number = 0, size: number = 5): Promise<ReviewListResponse> {
  const searchParams = new URLSearchParams()
  searchParams.append('page', page.toString())
  searchParams.append('size', size.toString())
  
  return apiClient(`/communityPlace/reviews/${specificAddressId}?${searchParams.toString()}`)
} 