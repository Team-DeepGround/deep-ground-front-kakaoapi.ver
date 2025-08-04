import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
      formData.append("scope", rating.toString()); // 별점(double)으로 전송 (string)
      formData.append("content", text);
      formData.append("address.address", schedule.location || "");
      // 위도/경도 값이 없으면 반드시 '0'으로 보냄
      const safeLat = schedule.lat !== undefined && schedule.lat !== null && schedule.lat !== "" ? String(schedule.lat) : "0";
      const safeLng = schedule.lng !== undefined && schedule.lng !== null && schedule.lng !== "" ? String(schedule.lng) : "0";
      formData.append("address.latitude", safeLat);
      formData.append("address.longitude", safeLng);
      images.forEach((file, idx) => {
        formData.append("images", file);
      });

      // 디버깅용 콘솔 로그 추가
      console.log("lat:", schedule.lat);
      console.log("lng:", schedule.lng);
      for (let pair of formData.entries()) {
        console.log(pair[0] + ": " + pair[1]);
      }

      const token = await auth.getToken();
      const res = await fetch("http://localhost:3000/api/v1/communityplace/reviews", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });
      const response = await res.json();
      if (res.ok || response.status === 201) {
        toast({
          title: "성공",
          description: "리뷰가 성공적으로 등록되었습니다.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "리뷰 등록 실패",
          description: response.message || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "리뷰 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };


  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>리뷰 작성</DialogTitle>
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
                  onClick={() => handleStarClick(i)}
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
            리뷰 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 