"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import FileUpload from "@/components/file-upload"
import { api } from "@/lib/api-client"

export default function EditAnswerPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [content, setContent] = useState("")
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [questionId, setQuestionId] = useState<number | null>(null)
  const answerId = params.id

    async function fetchAnswer() {
      setLoading(true)
      try {
        const res = await api.get(`/answers/${answerId}`)
      console.log('res 전체:', res)
      setContent(res.content || "")
        let urls: string[] = [];
      if (Array.isArray(res.imageUrls)) {
        urls = res.imageUrls.map((img: any) => {
            const url = typeof img === 'string' ? img : img.url;
            return url.replace(/^@/, '');
          })
        }
        setExistingImages(urls)
      setQuestionId(res.questionId || null)
      } catch (e) {
        toast({ title: "답변 불러오기 실패", description: "답변 정보를 불러올 수 없습니다.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
  useEffect(() => {
    if (answerId) fetchAnswer()
  }, [answerId])

  const handleImageUpload = (files: File[]) => {
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

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((img) => img !== url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content) {
      toast({ title: "필수 정보 누락", description: "답변 내용을 입력해주세요.", variant: "destructive" })
      return
    }
    if (uploadedImages.length > 5) {
      toast({ title: "이미지 개수 초과", description: "이미지는 최대 5개까지 첨부할 수 있습니다.", variant: "destructive" })
      return
    }
    if (!questionId) {
      toast({ title: "질문 ID 없음", description: "질문 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.", variant: "destructive" });
      return;
    }

    const formData = new FormData()
    formData.append("answerContent", content)
    formData.append("questionId", questionId?.toString() || "")
    uploadedImages.forEach(file => formData.append("images", file))

    // 디버깅: 전송할 데이터 확인
    console.log('수정할 답변 ID:', answerId)
    console.log('질문 ID:', questionId)
    console.log('답변 내용:', content)
    console.log('업로드할 이미지 개수:', uploadedImages.length)
    console.log('기존 이미지 개수:', existingImages.length)
    
    // FormData 내용 확인
    for (let [key, value] of formData.entries()) {
      console.log('FormData:', key, value)
    }

    try {
      const accessToken = localStorage.getItem("auth_token");
      console.log('Access Token:', accessToken ? '존재함' : '없음')
      
             const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1/answers/${answerId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Content-Type은 명시하지 않음 (FormData는 브라우저가 자동 세팅)
        },
        body: formData,
      });
      
      console.log('응답 상태:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('서버 응답:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      toast({ title: "답변 수정 성공", description: "답변이 성공적으로 수정되었습니다." })
      // 수정 후 최신 답변 정보를 다시 불러와서 이미지가 바로 반영되도록 함
      await fetchAnswer();
      setUploadedImages([]);
      // 질문 상세 페이지로 이동
      if (questionId) {
        router.push(`/questions/${questionId}?refresh=true`)
      } else {
        router.back()
      }
    } catch (error: any) {
      console.error('답변 수정 에러:', error)
      toast({ title: "답변 수정 실패", description: error?.message || "답변 수정 중 오류가 발생했습니다.", variant: "destructive" })
    }
  }

  if (loading) return <div className="text-center py-20">답변 정보를 불러오는 중...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">답변 수정하기</h1>
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>답변 수정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="답변 내용을 입력하세요"
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>이미지 첨부</Label>
                <FileUpload
                  onFilesSelect={handleImageUpload}
                  accept="image/*"
                  maxSize={5}
                  multiple={true}
                  buttonText="이미지 선택"
                />

                {existingImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>기존 이미지</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {existingImages.map((url, index) => (
                        <div key={url || index} className="relative group">
                          <img
                            src={url || "/placeholder.svg"}
                            alt={`Existing ${index + 1}`}
                            className="h-24 w-full object-cover rounded-md"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeExistingImage(url)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label>새로 첨부한 이미지 ({uploadedImages.length})</Label>
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>답변 수정하기</Button>
          </div>
        </form>
      </div>
    </div>
  )
} 