"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<"send" | "reset">("send")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // 1단계: 비밀번호 재설정 이메일 발송
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      toast({ title: "유효하지 않은 이메일", description: "올바른 이메일 형식을 입력해주세요.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/password/reset/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "이메일 발송 성공", description: "비밀번호 재설정 이메일이 발송되었습니다." })
        setStep("reset")
      } else {
        toast({ title: "이메일 발송 실패", description: data.message || "이메일 발송에 실패했습니다.", variant: "destructive" })
      }
    } catch {
      toast({ title: "이메일 발송 실패", description: "서버와 통신 중 오류가 발생했습니다.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // 2단계: 인증코드+새 비밀번호로 재설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast({ title: "비밀번호 오류", description: "비밀번호는 8자 이상이어야 합니다.", variant: "destructive" })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "비밀번호 불일치", description: "비밀번호와 확인이 일치하지 않습니다.", variant: "destructive" })
      return
    }
    if (!code) {
      toast({ title: "인증 코드 누락", description: "이메일로 받은 인증 코드를 입력하세요.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          newPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "비밀번호 재설정 성공", description: "비밀번호가 성공적으로 변경되었습니다." })
        router.push("/auth/login")
      } else {
        toast({ title: "비밀번호 재설정 실패", description: data.message || "비밀번호 재설정에 실패했습니다.", variant: "destructive" })
      }
    } catch {
      toast({ title: "비밀번호 재설정 실패", description: "서버와 통신 중 오류가 발생했습니다.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-md p-6">
      {step === "send" && (
        <form onSubmit={handleSendEmail} className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">비밀번호 재설정 이메일 발송</h2>
          <Label htmlFor="email" className="mb-3 block">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일을 입력하세요"
            disabled={isLoading}
            required
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "발송 중..." : "이메일 발송"}
          </Button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetPassword}>
          <h2 className="text-2xl font-bold mb-4">비밀번호 재설정</h2>

          <div className="mb-6">
            <Label htmlFor="code" className="mb-3 block">인증 코드</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="이메일로 받은 인증 코드를 입력하세요"
              disabled={isLoading}
              required
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="newPassword" className="mb-3 block">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요"
              disabled={isLoading}
              required
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="confirmPassword" className="mb-3 block">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "재설정 중..." : "비밀번호 재설정"}
          </Button>
        </form>
      )}
    </div>
  )
}
