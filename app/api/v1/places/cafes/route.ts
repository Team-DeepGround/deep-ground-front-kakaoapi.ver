import { NextRequest, NextResponse } from "next/server"

// 실제 백엔드 API로 프록시
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const specificAddressId = searchParams.get('specificAddressId')
    
    if (!specificAddressId) {
      return NextResponse.json(
        { error: "specificAddressId is required" },
        { status: 400 }
      )
    }

    // 실제 백엔드 API 호출
    const backendUrl = `http://localhost:8080/api/v1/community-place/${specificAddressId}`
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Authorization 헤더는 클라이언트에서 전달받아야 함
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { error: "Backend API request failed", details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Proxy API error:", error)
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 새로운 카페 추가 로직 (실제 백엔드와 연동 필요)
    const newCafe = {
      id: Date.now(), // 임시 ID 생성
      ...body,
      createdAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: newCafe,
      message: '카페가 성공적으로 추가되었습니다.'
    })
  } catch (error) {
    console.error('카페 추가 실패:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '카페 추가에 실패했습니다.' 
      },
      { status: 500 }
    )
  }
} 