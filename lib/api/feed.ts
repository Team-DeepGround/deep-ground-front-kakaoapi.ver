import { api, ApiError } from '../api-client';
import type { File } from 'buffer'; // File 타입이 필요할 경우(환경에 따라 조정)
import { auth } from '@/lib/auth';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1`;

// ====== Feed DTO ======
export interface FeedCreateRequest {
  content: string;
  images?: File[];
}

export interface FeedUpdateRequest {
  content: string;
  images?: File[];
}

export interface FeedResponse {
  id: number;
  content: string;
  memberName: string;
  createdAt: string;
  imageIds: number[];
}

export interface FetchFeedResponse {
  memberId: number;
  feedId: number;
  memberName: string;
  content: string;
  likeCount: number;
  liked: boolean;
  commentCount: number;
  shareCount: number;
  profileImageId: number;
  createdAt: string;
  mediaIds: number[];
  isShared: boolean;
  sharedFeed?: FetchFeedResponse;
  sharedBy?: {
    memberId: number;
    memberName: string;
    profileImageId: number;
  };
}

export interface FetchFeedsResponse {
  status: number;
  message: string;
  result: {
    feeds: FetchFeedResponse[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null;
}

export interface FetchFeedSummaryResponse {
  feedId: number;
  memberName: string;
  content: string;
  createdAt: string;
}

export interface FetchFeedSummariesResponse {
  status: number;
  message: string;
  result: {
    feedSummaries: FetchFeedSummaryResponse[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null;
}

export interface FeedMediaResponse {
  image: any;
  extension: string;
}

// ====== Feed Comment DTO ======
export interface FetchFeedCommentResponse {
  memberId: number;
  feedCommentId: number;
  memberName: string;
  content: string;
  replyCount: number;
  likeCount: number;
  liked: boolean;
  profileImageId: number;
  createdAt: string;
  mediaIds: number[];
}

export interface FetchFeedCommentsResponse {
  status: number;
  message: string;
  result: {
    feedComments: FetchFeedCommentResponse[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null;
}

// ====== Feed Reply DTO ======
export interface FetchFeedReplyResponse {
  memberId: number;
  feedReplyId: number;
  memberName: string;
  content: string;
  likeCount: number;
  liked: boolean;
  profileImageId: number;
  createdAt: string;
  mediaIds: number[];
}

export interface FetchFeedRepliesResponse {
  status: number;
  message: string;
  result: {
    feedReplies: FetchFeedReplyResponse[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null;
}

export interface ShareFeedRequest {
  content: string;
  originFeedId: number;
}

export interface ShareFeedResponse {
  status: number;
  message: string;
  result: null;
}

// ====== Feed API 함수 ======
export async function fetchFeeds({ page = 0, size = 10, sort = 'createdAt,desc' }: { page?: number; size?: number; sort?: string } = {}): Promise<FetchFeedsResponse> {
  return await api.get('/feed/list', {
    params: { page: String(page), size: String(size), sort },
  });
}

export async function fetchFeedSummaries({ page = 0, size = 10, sort = 'createdAt,desc' }: { page?: number; size?: number; sort?: string } = {}): Promise<FetchFeedSummariesResponse> {
  return await api.get('/feed/summaries', {
    params: { page: String(page), size: String(size), sort },
  });
}

export async function fetchFeedById(feedId: number): Promise<{ status: number; message: string; result: FetchFeedResponse | null }> {
  return await api.get(`/feed/${feedId}`);
}

export async function createFeed(formData: FormData): Promise<any> {
  return await apiClientFormData('/feed', {
    method: 'POST',
    body: formData,
  });
}

export async function shareFeed(content: string, originFeedId: number): Promise<any> {
  return await api.post('/feed/share', { content, originFeedId });
}

export async function likeFeed(feedId: number): Promise<any> {
  return await api.post(`/feed/${feedId}/like`);
}

export async function unlikeFeed(feedId: number): Promise<any> {
  return await api.delete(`/feed/${feedId}/like`);
}

export function getFeedMediaUrl(mediaId: number): string {
  return `${API_BASE_URL}/feed/media/${mediaId}`;
}

export function getProfileMediaUrl(mediaId: number): string {
  return `${API_BASE_URL}/profile/media/${mediaId}`;
}

// ====== Feed Comment DTO 및 API ======
export async function fetchFeedComments(feedId: number): Promise<FetchFeedCommentsResponse> {
  return await api.get(`/feed/comment/list/${feedId}`);
}

export async function createFeedComment(formData: FormData): Promise<any> {
  return await apiClientFormData(`/feed/comment`, {
    method: 'POST',
    body: formData,
  });
}

export function getFeedCommentMediaUrl(mediaId: number): string {
  return `${API_BASE_URL}/feed/comment/media/${mediaId}`;
}

export async function updateFeedComment(feedCommentId: number, formData: FormData): Promise<any> {
  return await apiClientFormData(`/feed/comment/${feedCommentId}`, {
    method: 'PUT',
    body: formData,
  });
}

export async function deleteFeedComment(feedCommentId: number): Promise<any> {
  return await api.delete(`/feed/comment/${feedCommentId}`);
}

export async function likeFeedComment(feedCommentId: number): Promise<any> {
  return await api.post(`/feed/comment/${feedCommentId}/like`);
}

export async function unlikeFeedComment(feedCommentId: number): Promise<any> {
  return await api.delete(`/feed/comment/${feedCommentId}/like`);
}

// ====== Feed Reply DTO 및 API ======
export async function fetchFeedReplies(feedCommentId: number): Promise<FetchFeedRepliesResponse> {
  return await api.get(`/feed/comment/reply/list/${feedCommentId}`);
}

export async function createFeedReply(formData: FormData): Promise<any> {
  return await apiClientFormData('/feed/comment/reply', {
    method: 'POST',
    body: formData,
  });
}

export async function updateFeedReply(feedReplyId: number, formData: FormData): Promise<any> {
  return await apiClientFormData(`/feed/comment/reply/${feedReplyId}`, {
    method: 'PUT',
    body: formData,
  });
}

export async function deleteFeedReply(feedReplyId: number): Promise<any> {
  return await api.delete(`/feed/comment/reply/${feedReplyId}`);
}

export async function likeFeedReply(feedReplyId: number): Promise<any> {
  return await api.post(`/feed/comment/reply/${feedReplyId}/like`);
}

export async function unlikeFeedReply(feedReplyId: number): Promise<any> {
  return await api.delete(`/feed/comment/reply/${feedReplyId}/like`);
}

export function getFeedReplyMediaUrl(mediaId: number): string {
  return `${API_BASE_URL}/feed/reply/media/${mediaId}`;
}

// ====== 이미지 Blob 가져오기 함수들 ======
export async function getFeedMediaBlob(mediaId: number): Promise<Blob> {
  const token = await auth.getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/feed/media/${mediaId}`, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, '이미지를 가져올 수 없습니다');
  }
  return await response.blob();
}

export async function getProfileMediaBlob(mediaId: number): Promise<Blob> {
  const token = await auth.getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/profile/media/${mediaId}`, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, '이미지를 가져올 수 없습니다');
  }
  return await response.blob();
}

export async function getFeedCommentMediaBlob(mediaId: number): Promise<Blob> {
  const token = await auth.getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/feed/comment/media/${mediaId}`, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, '이미지를 가져올 수 없습니다');
  }
  return await response.blob();
}

export async function getFeedReplyMediaBlob(mediaId: number): Promise<Blob> {
  const token = await auth.getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}/feed/reply/media/${mediaId}`, { headers });
  if (!response.ok) {
    throw new ApiError(response.status, '이미지를 가져올 수 없습니다');
  }
  return await response.blob();
} 


export async function apiClientFormData(endpoint: string, options: RequestInit = {}) {
  const { body, ...fetchOptions } = options;
  
  // Construct URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(fetchOptions.headers);

  // 토큰이 있으면 Authorization 헤더 추가
  const token = await auth.getToken();
  console.log('API 요청 - 현재 토큰:', token);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('API 요청 - Authorization 헤더 추가됨:', headers.get('Authorization'));
  } else {
    console.log('API 요청 - 토큰 없음, Authorization 헤더 미포함');
  }

  const init: RequestInit = {
    ...fetchOptions,
    headers,
    body,
  };

  try {
    console.log('API 요청 시작:', {
      url,
      method: init.method,
      headers: Object.fromEntries(headers.entries())
    });
    
    const response = await fetch(url, init);
    const data = await response.json();

    console.log('API 응답:', {
      status: response.status,
      data
    });

    if (!response.ok) {
      throw new ApiError(response.status, data.message || 'API 요청 실패');
    }

    return data;
  } catch (error) {
    console.error('API 요청 실패:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, '서버 오류가 발생했습니다');
  }
}