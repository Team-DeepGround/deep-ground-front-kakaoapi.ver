import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { auth } from "@/lib/auth";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: any;
}

export default function ReviewModal({ open, onOpenChange, schedule }: ReviewModalProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [reviewLoaded, setReviewLoaded] = useState(false);
  // 리뷰 조회 결과(있으면 객체, 없으면 null)
  const [myReview, setMyReview] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  // 리뷰 조회 API 호출
  useEffect(() => {
    async function fetchMyReview() {
      if (!schedule) return;
      setReviewLoaded(false);
      setEditMode(false); // 모달 열릴 때마다 수정모드 해제
      try {
        const token = await auth.getToken();
        if (!token) {
          setMyReview(null);
          setReviewLoaded(true);
          return;
        }
        const res = await fetch(`/api/v1/communityPlace/review/my?scheduleId=${schedule.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          console.log("[리뷰 조회 응답]", data); // 실제 응답 구조 확인
          setMyReview(data); // 실제 응답 구조에 따라 조정 필요
          setRating(data.scope || 0);
          setText(data.content || "");
          // 이미지, 주소 등 필요시 추가 세팅
        } else if (res.status === 404) {
          setMyReview(null);
          setRating(0);
          setText("");
        }
      } catch (e) {
        setMyReview(null);
      } finally {
        setReviewLoaded(true);
      }
    }
    if (open) fetchMyReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, schedule]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleStarClick = (idx: number) => {
    setRating(idx + 1);
  };

  const handleSubmit = async () => {
    if (!schedule) {
      toast({
        title: "오류",
        description: "리뷰를 등록할 대상 일정이 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("scope", rating.toString());
      formData.append("content", text);
      formData.append("address.address", schedule.location || "");
      const safeLat = schedule.lat !== undefined && schedule.lat !== null && schedule.lat !== "" ? String(schedule.lat) : "0";
      const safeLng = schedule.lng !== undefined && schedule.lng !== null && schedule.lng !== "" ? String(schedule.lng) : "0";
      formData.append("address.latitude", safeLat);
      formData.append("address.longitude", safeLng);
      if (schedule.placeId) {
        formData.append("specificAddressId", schedule.placeId.toString());
      } else {
        toast({
          title: "오류",
          description: "장소 정보가 없어 리뷰를 등록할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      images.forEach((file, idx) => {
        formData.append("images", file);
      });

      // 수정일 경우 필요한 값 추가
      if (myReview) {
        formData.append("communityPlaceReviewId", myReview.communityPlaceReviewId);
      }

      const token = await auth.getToken();
      if (!token) {
        toast({
          title: "로그인이 필요합니다",
          description: "리뷰를 등록/수정하려면 로그인해주세요.",
          variant: "destructive",
        });
        return;
      }

      let res, response;
      let url;
      if (myReview) {
        url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1/communityPlace/modify/${schedule.placeId}`;
        console.log('리뷰 수정 fetch URL:', url);
        // 수정(put)
        res = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // 등록(post)
        res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1/communityPlace/reviews`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }
      response = await res.json();

      if (res.ok || response.status === 201) {
        toast({
          title: "성공",
          description: myReview ? "리뷰가 성공적으로 수정되었습니다." : "리뷰가 성공적으로 등록되었습니다.",
        });
        onOpenChange(false);
      } else {
        console.log("리뷰 등록/수정 실패 응답:", response);
        toast({
          title: "리뷰 등록/수정 실패",
          description: response.message || response.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[리뷰 등록/수정 fetch 에러]", error);
      toast({
        title: "오류",
        description: "리뷰 등록/수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };


  if (!schedule) return null;

  // 로딩 중
  if (!reviewLoaded) return <div className="p-8 text-center">리뷰 정보를 불러오는 중...</div>;

  // 리뷰가 있고, 수정모드가 아니면 읽기 전용으로 보여줌
  if (myReview && !editMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>내가 작성한 리뷰</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="mb-1 font-semibold">별점</div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={
                      "text-2xl " + (i < myReview.scope ? "text-yellow-400" : "text-gray-300")
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 font-semibold">리뷰 내용</div>
              <Textarea value={myReview.content} readOnly rows={4} />
            </div>
            {myReview.mediaUrl && myReview.mediaUrl.length > 0 && (
              <div>
                <div className="mb-1 font-semibold">업로드한 사진</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {myReview.mediaUrl.map((url: string, idx: number) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`리뷰 이미지 ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button onClick={() => setEditMode(true)}>
              수정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 리뷰가 없거나, 수정모드면 입력 폼(등록/수정) 노출
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{myReview ? "리뷰 수정" : "리뷰 작성"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="mb-1 font-semibold">별점</div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <button
                  key={i}
                  type="button"
                  className={
                    "text-2xl " + (i < rating ? "text-yellow-400" : "text-gray-300")
                  }
                  onClick={() => setRating(i + 1)}
                  aria-label={`별점 ${i + 1}점`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 font-semibold">리뷰 내용</div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="리뷰를 입력하세요"
              rows={4}
            />
          </div>
          <div>
            <div className="mb-1 font-semibold">사진 업로드</div>
            <Input type="file" accept="image/*" multiple onChange={handleImageChange} />
            <div className="flex gap-2 mt-2 flex-wrap">
              {images.map((file, idx) => (
                <img
                  key={idx}
                  src={URL.createObjectURL(file)}
                  alt={`리뷰 이미지 ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded border"
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={rating === 0 || !text.trim()}>
            {myReview ? "리뷰 수정" : "리뷰 등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 