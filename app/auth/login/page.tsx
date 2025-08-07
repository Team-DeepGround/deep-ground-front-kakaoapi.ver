"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { api } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import type { LoginResponse } from "@/types/auth"

const SOCIAL_PROVIDERS = [
  { name: "Google", provider: "google", logo: "/google.svg" },
  { name: "Naver", provider: "naver", logo: "/naver.svg" },
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await api.post<LoginResponse>(
        "/auth/login",
        { email, password },
        { requireAuth: false }
      )

      console.log("👉 로그인 응답 데이터:", response?.result)
      console.log("👉 role:", response?.result?.role)
      console.log("👉 email:", response?.result?.email)

      if (response.result?.accessToken) {
        // ✅ role, email, memberId 추가 저장
        login(
          response.result.accessToken,
          response.result.role,
          response.result.email,
          response.result.memberId
        )

        const role = response.result.role
        if (role === "ROLE_ADMIN") {
          router.push("/admin")
          return
        }
        if (role === "ROLE_GUEST") {
          toast({
            title: "이메일 인증 필요",
            description: "계정을 사용하려면 이메일 인증을 완료해주세요.",
          })
          router.push(`/auth/verify-email?email=${email}`)
          return
        }

        toast({
          title: "로그인 성공",
          description: "성공적으로 로그인되었습니다.",
        })

        try {
          const profileRes = await api.get("/members/profile/me")
          if (profileRes.result && Object.keys(profileRes.result).length > 0) {
            router.push("/")
          } else {
            router.push("/profile/new")
          }
        } catch {
          router.push("/profile/new")
        }
      } else {
        toast({
          title: "로그인 실패",
          description: "잘못된 응답입니다.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("로그인 에러:", error)
      toast({
        title: "로그인 실패",
        description: error?.message || "이메일 또는 비밀번호가 올바르지 않습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/auth/oauth/${provider}/login`)
      const { redirectUrl } = await res.json()
      if (redirectUrl) {
        window.location.href = `http://localhost:8080/api/v1${redirectUrl}`
      } else {
        toast({
          title: "소셜 로그인 실패",
          description: "소셜 로그인 URL을 가져오지 못했습니다.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "소셜 로그인 실패",
        description: "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
            />
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
            />
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인"}
            </Button>
            <Button
              type="button"
              className="w-full mt-3 bg-white text-black border border-gray-300 hover:bg-gray-100"
              onClick={() => router.push("/auth/register")}
            >
              회원가입
            </Button>
            <div className="flex justify-end mt-2">
              <span className="text-xs text-gray-500">
                비밀번호를 잊어버리셨나요?{" "}
                <button
                  type="button"
                  className="underline text-xs text-gray-700 hover:text-black"
                  onClick={() => router.push("/auth/reset-password")}
                  style={{ padding: 0, background: "none", border: "none" }}
                >
                  비밀번호 찾기
                </button>
              </span>
            </div>
          </div>
        </form>

        <div className="mt-8 space-y-2">
          {SOCIAL_PROVIDERS.map(({ name, provider, logo }) => (
            <Button
              key={provider}
              type="button"
              className="w-full bg-white text-black border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
              onClick={() => handleSocialLogin(provider)}
            >
              <img src={logo} alt={`${name} 로고`} className="w-5 h-5 mr-2" />
              {name}로 로그인
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
