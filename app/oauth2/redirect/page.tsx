"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { api } from "@/lib/api-client"
import { toast } from "sonner"

function OAuth2RedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const accessToken = searchParams.get("accessToken")
    const refreshToken = searchParams.get("refreshToken")
    const email = searchParams.get("email")
    const nickname = searchParams.get("nickname")

    const handleRedirect = async () => {
      if (accessToken) {
        login(accessToken)
        toast.success(`${nickname || email}님, 소셜 로그인에 성공했습니다.`)

        try {
          // 프로필 존재 여부 확인 API 호출
          const profileRes = await api.get("/members/profile/me", {
            headers: { Authorization: `Bearer ${accessToken}` }
          })

          if (profileRes.result && Object.keys(profileRes.result).length > 0) {
            // 프로필 있음 → 홈으로 이동
            router.replace("/")
          } else {
            // 프로필 없음 → 프로필 생성 페이지로 이동
            router.replace("/profile/new")
          }
        } catch (error) {
          console.error("프로필 조회 중 에러:", error)
          // 에러 발생 시도 프로필 생성 페이지로 이동 (보수적 처리)
          router.replace("/profile/new")
        }
      } else {
        toast.error("소셜 로그인에 실패했습니다.")
        router.replace("/auth/login")
      }
    }

    handleRedirect()
  }, [searchParams, login, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <span>로그인 처리 중...</span>
    </div>
  )
}

export default function OAuth2RedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span>로딩 중...</span>
      </div>
    }>
      <OAuth2RedirectContent />
    </Suspense>
  )
}
