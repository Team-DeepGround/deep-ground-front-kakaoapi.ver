"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import FileUpload from "@/components/file-upload"
import { api } from "@/lib/api-client"
import { apiClientFormData } from "@/lib/api-client"

export default function EditQuestionPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 미리 정의된 태그 목록 (질문 작성과 동일)
  const predefinedTags = [
    "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express", "NestJS", "Spring", "Django", "Flask", "Java", "Python", "C#", "Go", "Rust", "PHP", "Ruby", "HTML", "CSS", "Tailwind", "Bootstrap", "SASS", "GraphQL", "REST API", "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git", "GitHub", "GitLab", "Testing", "TDD", "DevOps", "Algorithm", "Data Structure", "Machine Learning", "AI", "Frontend", "Backend", "Database", "Mobile", "Web"
  ]

  useEffect(() => {
    async function fetchQuestion() {
      setLoading(true)
      try {
        const res = await api.get(`/questions/${params.id}`)
        const q = res.result?.question || res.result
        setTitle(q.title || "")
        setContent(q.content || "")
        setTags(q.techStacks || q.tags || [])
        setExistingImages(q.mediaUrls || [])
      } catch (e) {
        toast({ title: "질문 불러오기 실패", description: "질문 정보를 불러올 수 없습니다.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchQuestion()
  }, [params.id])

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag))
    } else {
      setTags([...tags, tag])
    }
  }

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

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (id: number) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) {
      toast({ title: "필수 정보 누락", description: "제목과 내용을 모두 입력해주세요.", variant: "destructive" })
      return
    }
    if (tags.length === 0) {
      toast({ title: "태그 누락", description: "최소 하나 이상의 태그를 입력해주세요.", variant: "destructive" })
      return
    }
    if (uploadedImages.length > 10) {
      toast({ title: "이미지 개수 초과", description: "이미지는 최대 10개까지 첨부할 수 있습니다.", variant: "destructive" })
      return
    }
    const formData = new FormData()
    formData.append("title", title)
    formData.append("content", content)
    tags.forEach(tag => formData.append("techStacks", tag))
    uploadedImages.forEach(file => formData.append("images", file))
    formData.append("remainImageIds", JSON.stringify(existingImages.map(img => img.id)))
    const accessToken = localStorage.getItem("auth_token")
    try {
      // apiClientFormData는 POST만 지원하므로 fetch로 직접 PUT
             const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1/questions/${params.id}`
      const headers = new Headers()
      if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "질문 수정 성공", description: "질문이 성공적으로 수정되었습니다." })
        router.push(`/questions/${params.id}`)
      } else {
        toast({ title: "질문 수정 실패", description: data.message || "질문 수정 중 오류가 발생했습니다.", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "질문 수정 실패", description: error?.message || "질문 수정 중 오류가 발생했습니다.", variant: "destructive" })
    }
  }

  if (loading) return <div className="text-center py-20">질문 정보를 불러오는 중...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">질문 수정하기</h1>
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>질문 수정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" placeholder="질문 제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" placeholder="질문 내용을 상세히 작성해주세요" rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="images">이미지 첨부</Label>
                <FileUpload onFilesSelect={handleImageUpload} accept="image/*" maxSize={5} multiple={true} buttonText="이미지 선택" />
                {/* 기존 이미지 표시 및 삭제 */}
                {existingImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>기존 이미지 ({existingImages.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {existingImages.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <img src={image.url || "/placeholder.svg"} alt={image.alt} className="h-24 w-full object-cover rounded-md" />
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExistingImage(image.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* 새로 업로드한 이미지 표시 및 삭제 */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>새 이미지 ({uploadedImages.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img src={URL.createObjectURL(image) || "/placeholder.svg"} alt={`Uploaded ${index + 1}`} className="h-24 w-full object-cover rounded-md" />
                          <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeImage(index)}>
                            <X className="h-3 w-3" />
                          </Button>
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
                          <input type="checkbox" id={`tag-${tag}`} checked={tags.includes(tag)} onChange={() => handleTagToggle(tag)} className="accent-primary" />
                          <label htmlFor={`tag-${tag}`} className="text-sm cursor-pointer">{tag}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit">질문 수정 완료</Button>
          </div>
        </form>
      </div>
    </div>
  )
} 