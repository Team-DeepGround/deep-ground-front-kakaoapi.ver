import { NextRequest, NextResponse } from "next/server"

const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
const ALLOWED_ENDPOINTS = ['keyword.json', 'address.json', 'category.json']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint")
  const restParams = new URLSearchParams()

  for (const [key, value] of searchParams.entries()) {
    if (key !== "endpoint") {
      restParams.append(key, value)
    }
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint parameter" },
      { status: 400 }
    )
  }
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return NextResponse.json(
    { error: "Invalid endpoint parameter" },
    { status: 400 }
    )}

  if (!KAKAO_REST_API_KEY) {
    return NextResponse.json(
      { error: "Kakao REST API key is not configured on the server." },
      { status: 500 }
    )
  }

  const kakaoApiUrl = `https://dapi.kakao.com/v2/local/search/${endpoint}?${restParams.toString()}`

  try {
    const res = await fetch(kakaoApiUrl, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errorData = await res.json()
      return NextResponse.json(
        { error: "Kakao API request failed", details: errorData },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Proxy API error:", error)
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    )
  }
} 