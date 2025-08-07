"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import FileUpload from "@/components/file-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api-client"


export default function CreateQuestionPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const [tags, setTags] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<File[]>([])

  // 미리 정의된 태그 목록 추가
  const predefinedTags = [
    "Java", "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express", "NestJS", "Spring", "Django", "Flask", "Python", "C#", "Go", "Rust", "PHP", "Ruby", "HTML", "CSS", "Tailwind", "Bootstrap", "SASS", "GraphQL", "REST API", "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "GitHub", "GitLab", "Testing", "TDD", "DevOps", "Algorithm", "Data Structure", "Machine Learning", "AI", "Frontend", "Backend", "Database", "Mobile", "Web"
  ]

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag))
    } else {
      setTags([...tags, tag])
    }
  }

  // 여러 파일 업로드 핸들러 (FileUpload의 onFilesSelect와 연결)
  const handleImageUpload = (files: File[]) => {
    // 여러 파일 중 중복 아닌 것만 추가
    const newFiles = files.filter(file => !uploadedImages.some(f => f.name === file.name && f.size === file.size))
    if (newFiles.length < files.length) {
      toast({
        title: "중복 이미지",
        description: "이미 첨부된 이미지는 제외되었습니다.",
        variant: "destructive",
      })
    }
    setUploadedImages((prev) => [...prev, ...newFiles])
    if (newFiles.length > 0) {
      toast({
        title: "이미지 업로드",
        description: `${newFiles.length}개의 이미지가 추가되었습니다.`,
      })
    }
  }

  // 이미지 삭제 함수 복구
  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 필수 필드 검증
    if (!title || !content) {
      toast({
        title: "필수 정보 누락",
        description: "제목과 내용을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (tags.length === 0) {
      toast({
        title: "태그 누락",
        description: "최소 하나 이상의 태그를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    if (uploadedImages.length > 10) {
      toast({
        title: "이미지 개수 초과",
        description: "이미지는 최대 10개까지 첨부할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("title", title)
    formData.append("content", content)
    tags.forEach(tag => formData.append("techStacks", tag))
    uploadedImages.forEach(file => formData.append("images", file))

    // 실제 FormData 내용 콘솔 출력 (디버깅용)
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    const accessToken = localStorage.getItem("auth_token")

    if (!accessToken) {
      toast({
        title: "인증 실패",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }

    try {
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
      // Content-Type은 명시하지 않음
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1/questions`, fetchOptions)
      const data = await res.json()

      if (res.ok) {
        router.push("/questions")
      } else {
        toast({
          title: "질문 등록 실패",
          description: data.message || "질문 등록 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "질문 등록 실패",
        description: "질문 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">질문하기</h1>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>질문 작성</CardTitle>
              <CardDescription>개발 관련 질문을 작성해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  placeholder="질문 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea
                  id="content"
                  placeholder="질문 내용을 상세히 작성해주세요"
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">이미지 첨부</Label>
                <FileUpload
                  onFilesSelect={handleImageUpload}
                  accept="image/*"
                  maxSize={5} // 5MB
                  multiple={true}
                  buttonText="이미지 선택"
                />

                {uploadedImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>첨부된 이미지 ({uploadedImages.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image) || "/placeholder.svg"}
                            alt={`Uploaded ${index + 1}`}
                            className="h-24 w-full object-cover rounded-md"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-xs truncate mt-1">{image.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">관련 기술 태그</Label>
                <div className="border rounded-md p-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleTagToggle(tag)} />
                      </Badge>
                    ))}
                  </div>
                  <div className="border-t pt-3 mt-2">
                    <p className="text-sm text-muted-foreground mb-2">기술 태그 선택 (다중 선택 가능)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {predefinedTags.map((tag) => (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={tags.includes(tag)}
                            onCheckedChange={() => handleTagToggle(tag)}
                          />
                          <label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer">
                            {tag}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit">질문 등록하기</Button>
          </div>
        </form>
      </div>
    </div>
  )
}