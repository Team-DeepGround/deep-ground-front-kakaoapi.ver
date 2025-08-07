"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MessageSquare,
  ThumbsUp,
  Share2,
  MoreHorizontal,
  Repeat
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  likeFeed,
  unlikeFeed,
  FetchFeedResponse
} from "@/lib/api/feed"
import { FeedComments } from "./feed-comments"
import { ShareFeedDialog } from "./share-feed-dialog"
import { AuthImage } from "@/components/ui/auth-image"
import { ReportModal } from "@/components/report/report-modal"

interface FeedPostProps {
  post: FetchFeedResponse
  onRefresh: () => void
}

export function FeedPost({ post: initialPost, onRefresh }: FeedPostProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [post, setPost] = useState(initialPost)
  const [showComments, setShowComments] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const handleLike = async (feedId: number, liked: boolean) => {
    if (liked) {
      await unlikeFeed(feedId)
      toast({ title: "좋아요 취소", description: "게시물에 좋아요를 취소했습니다." })
      setPost((prev) => ({
        ...prev,
        liked: false,
        likeCount: prev.likeCount - 1
      }))
    } else {
      await likeFeed(feedId)
      toast({ title: "좋아요", description: "게시물에 좋아요를 표시했습니다." })
      setPost((prev) => ({
        ...prev,
        liked: true,
        likeCount: prev.likeCount + 1
      }))
    }
  }

  const handleShareClick = () => {
    setShowShareDialog(true)
  }

  const handleShareSuccess = () => {
    setShowShareDialog(false)
    onRefresh()
  }

  const handleToggleComments = () => {
    setShowComments(!showComments)
  }

  const renderSharedFeed = (sharedFeed: FetchFeedResponse) => (
    <Card className="mt-3 border-l-4 border-l-blue-500 bg-blue-50/50">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-blue-600 font-medium">공유된 피드</span>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6">
            {sharedFeed.profileImageId ? (
              <AuthImage
                mediaId={sharedFeed.profileImageId}
                type="profile"
                alt={sharedFeed.memberName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <AvatarImage src="/placeholder.svg" alt={sharedFeed.memberName} />
            )}
            <AvatarFallback className="text-xs">{sharedFeed.memberName[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{sharedFeed.memberName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(sharedFeed.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line">{sharedFeed.content}</p>
        {sharedFeed.mediaIds && sharedFeed.mediaIds.length > 0 && (
          <div className="mt-2 rounded-md overflow-hidden">
            {sharedFeed.mediaIds.map((id) => (
              <AuthImage
                key={id}
                mediaId={id}
                type="feed"
                alt="공유된 피드 이미지"
                className="w-full h-auto max-h-48 object-cover"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {post.profileImageId ? (
                  <AuthImage
                    mediaId={post.profileImageId}
                    type="profile"
                    alt={post.memberName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <AvatarImage src="/placeholder.svg" alt={post.memberName} />
                )}
                <AvatarFallback>{post.memberName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{post.memberName}</h3>
                <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</p>
                {post.isShared && post.sharedBy && (
                  <div className="flex items-center gap-1 mt-1">
                    <Repeat className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600">
                      {post.sharedBy.memberName}님이 공유함
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>저장하기</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReportModal(true)}>신고하기</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent
          className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => router.push(`/feed/${post.feedId}`)}
        >
          <p className="text-sm whitespace-pre-line">{post.content}</p>
          {post.mediaIds && post.mediaIds.length > 0 && (
            <div className="mt-3 rounded-md overflow-hidden">
              {post.mediaIds.map((id) => (
                <AuthImage
                  key={id}
                  mediaId={id}
                  type="feed"
                  alt="피드 이미지"
                  className="w-full h-auto mb-2"
                />
              ))}
            </div>
          )}
          {post.sharedFeed && renderSharedFeed(post.sharedFeed)}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-1 ${post.liked ? "text-primary" : ""}`}
              onClick={(e) => {
                e.stopPropagation()
                handleLike(post.feedId, post.liked)
              }}
            >
              <ThumbsUp className={`h-4 w-4 ${post.liked ? "fill-primary" : ""}`} />
              <span>{post.likeCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-1 ${showComments ? "text-primary" : ""}`}
              onClick={(e) => {
                e.stopPropagation()
                handleToggleComments()
              }}
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.commentCount}</span>
            </Button>
            {!post.isShared && (
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShareClick()
                }}
              >
                <Share2 className="h-4 w-4" />
                <span>{post.shareCount}</span>
              </Button>
            )}
          </div>
        </CardFooter>

        {showComments && <FeedComments feedId={post.feedId} onShow={true} />}
      </Card>

      <ShareFeedDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        originalFeed={post}
        onSuccess={handleShareSuccess}
      />

      <ReportModal
        targetId={post.feedId}
        targetType="FEED"
        open={showReportModal}
        setOpen={setShowReportModal}
        triggerText={""}
      />
    </>
  )
}
