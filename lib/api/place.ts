import { PlaceInfo, PlaceSearchParams, PlaceSearchResponse } from '@/types/place'

export const fetchPlacesApi = async (params: PlaceSearchParams): Promise<PlaceSearchResponse> => {
  const { specificAddressId, sortBy = 'rating', page = 1, size = 10 } = params
  
  const queryParams = new URLSearchParams({
    sortBy,
    page: page.toString(),
    size: size.toString()
  })

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'
  const url = `${baseUrl}/communityplace/${specificAddressId}?${queryParams.toString()}`
  
  console.log('API 호출 URL:', url)
  console.log('API 파라미터:', params)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('API 응답 성공:', data)
    return data
  } catch (error) {
    console.error('API 호출 실패:', error)
    throw error
  }
} 