"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null)
  const [isCheckingNickname, setIsCheckingNickname] = useState(false)
  const [isNicknameAvailable, setIsNicknameAvailable] = useState<boolean | null>(null)

  const { toast } = useToast()
  const router = useRouter()

  // 이메일 형식 검증
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 환경변수에서 API BASE URL을 가져옵니다.
  const API_BASE = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1/auth`

  // 이메일 중복 확인
  const checkEmailAvailability = async () => {
    if (!email || !isValidEmail(email)) {
      toast({
        title: "유효하지 않은 이메일",
        description: "올바른 이메일 형식을 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    setIsCheckingEmail(true)
    try {
      const res = await fetch(
        `${API_BASE}/check-email?email=${encodeURIComponent(email)}`
      )
      if (res.ok) {
        setIsEmailAvailable(true)
        toast({
          title: "사용 가능한 이메일",
          description: "입력하신 이메일은 사용 가능합니다.",
          variant: "default",
        })
      } else {
        setIsEmailAvailable(false)
        toast({
          title: "이미 사용 중인 이메일",
          description: "입력하신 이메일은 이미 사용 중입니다. 다른 이메일을 입력해주세요.",
          variant: "destructive",
        })
      }
    } catch {
      setIsEmailAvailable(false)
      toast({
        title: "오류",
        description: "이메일 중복 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
    setIsCheckingEmail(false)
  }

  // 닉네임 중복 확인
  const checkNicknameAvailability = async () => {
    if (!nickname || nickname.length < 2) {
      toast({
        title: "유효하지 않은 닉네임",
        description: "닉네임은 2자 이상이어야 합니다.",
        variant: "destructive",
      })
      return
    }
    setIsCheckingNickname(true)
    try {
      const res = await fetch(
        `${API_BASE}/check-nickname?nickname=${encodeURIComponent(nickname)}`
      )
      if (res.ok) {
        setIsNicknameAvailable(true)
        toast({
          title: "사용 가능한 닉네임",
          description: "입력하신 닉네임은 사용 가능합니다.",
          variant: "default",
        })
      } else {
        setIsNicknameAvailable(false)
        toast({
          title: "이미 사용 중인 닉네임",
          description: "입력하신 닉네임은 이미 사용 중입니다. 다른 닉네임을 입력해주세요.",
          variant: "destructive",
        })
      }
    } catch {
      setIsNicknameAvailable(false)
      toast({
        title: "오류",
        description: "닉네임 중복 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
    setIsCheckingNickname(false)
  }

  // 회원가입 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !confirmPassword || !nickname) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    if (!isValidEmail(email)) {
      toast({
        title: "이메일 형식 오류",
        description: "올바른 이메일 형식을 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    if (password !== confirmPassword) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
        variant: "destructive",
      })
      return
    }
    if (!agreedToTerms) {
      toast({
        title: "약관 동의 필요",
        description: "서비스 이용약관에 동의해주세요.",
        variant: "destructive",
      })
      return
    }
    if (isEmailAvailable !== true) {
      toast({
        title: "이메일 중복 확인 필요",
        description: "이메일 중복 확인을 진행해주세요.",
        variant: "destructive",
      })
      return
    }
    if (isNicknameAvailable !== true) {
      toast({
        title: "닉네임 중복 확인 필요",
        description: "닉네임 중복 확인을 진행해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nickname,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: "회원가입 성공",
          description: "이메일 인증을 위해 인증 페이지로 이동합니다.",
        })
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
      } else {
        toast({
          title: "회원가입 실패",
          description: data.message || "회원가입 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "회원가입 실패",
        description: "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto flex max-w-sm flex-col justify-center space-y-6 px-2 py-12">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-bold">회원가입</h1>
        <p className="text-sm text-muted-foreground">DeepGround에 가입하고 개발자 커뮤니티에 참여하세요</p>
      </div>
      <div className="grid gap-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            {/* 이메일 입력 및 중복 확인 */}
            <div className="grid gap-2">
              <Label htmlFor="email">이메일</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setIsEmailAvailable(null)
                  }}
                  disabled={isLoading}
                  className={
                    isEmailAvailable === true
                      ? "border-green-500 focus-visible:ring-green-500"
                      : isEmailAvailable === false
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkEmailAvailability}
                  disabled={isLoading || isCheckingEmail || !email}
                >
                  {isCheckingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "중복 확인"}
                </Button>
              </div>
              {isEmailAvailable === true && <p className="text-xs text-green-500">사용 가능한 이메일입니다.</p>}
              {isEmailAvailable === false && <p className="text-xs text-red-500">이미 사용 중인 이메일입니다.</p>}
            </div>
            {/* 닉네임 입력 및 중복 확인 */}
            <div className="grid gap-2">
              <Label htmlFor="nickname">닉네임</Label>
              <div className="flex gap-2">
                <Input
                  id="nickname"
                  type="text"
                  placeholder="사용할 닉네임"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value)
                    setIsNicknameAvailable(null)
                  }}
                  disabled={isLoading}
                  className={
                    isNicknameAvailable === true
                      ? "border-green-500 focus-visible:ring-green-500"
                      : isNicknameAvailable === false
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={checkNicknameAvailability}
                  disabled={isLoading || isCheckingNickname || !nickname}
                >
                  {isCheckingNickname ? <Loader2 className="h-4 w-4 animate-spin" /> : "중복 확인"}
                </Button>
              </div>
              {isNicknameAvailable === true && <p className="text-xs text-green-500">사용 가능한 닉네임입니다.</p>}
              {isNicknameAvailable === false && <p className="text-xs text-red-500">이미 사용 중인 닉네임입니다.</p>}
            </div>
            {/* 비밀번호 및 비밀번호 확인 */}
            <div className="grid gap-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {/* 약관 동의 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                disabled={isLoading}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <span>
                  <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                    서비스 이용약관
                  </Link>
                  에 동의합니다
                </span>
              </label>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  가입 중...
                </>
              ) : (
                "회원가입"
              )}
            </Button>
          </div>
        </form>
        <div className="text-center text-sm">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
            로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
