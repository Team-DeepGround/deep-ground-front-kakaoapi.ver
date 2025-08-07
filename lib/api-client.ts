import { toast } from 'sonner';
import { auth } from '@/lib/auth';

// 환경변수에서 API BASE URL을 가져옵니다.
const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1`;

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export async function apiClient(endpoint: string, options: RequestOptions = {}) {
    const { params, ...fetchOptions } = options;

    // Construct URL with query parameters
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    // 기본 헤더 설정
    const headers = new Headers(fetchOptions.headers);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

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

        if (!response.ok && response.status !== 302) {
            if (response.status === 401) {
                // 401 에러 발생 시 로그인 페이지로 리다이렉트
                window.location.href = '/auth/login';
            }
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

export const api = {
    get: (endpoint: string, options?: RequestOptions) =>
        apiClient(endpoint, { ...options, method: 'GET' }),

    post: (endpoint: string, data?: any, options?: RequestOptions) =>
        apiClient(endpoint, {
            ...options,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: (endpoint: string, data?: any, options?: RequestOptions) =>
        apiClient(endpoint, {
            ...options,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: (endpoint: string, data?: any, options?: RequestOptions) =>
        apiClient(endpoint, {
            ...options,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: (endpoint: string, options?: RequestOptions) =>
        apiClient(endpoint, { ...options, method: 'DELETE' }),

    // 파일 업로드 전용 메서드
    upload: (endpoint: string, formData: FormData, options?: RequestOptions) =>
        apiClient(endpoint, {
            ...options,
            method: 'POST',
            body: formData,
        }),
};

export async function apiClientFormData(endpoint: string, data: any, accessToken: string) {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}/api/v1${endpoint}`;
    const headers = new Headers();

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // FormData가 아닐 때만 Content-Type 세팅
    let body;
    if (data instanceof FormData) {
        body = data;
    } else if (data) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(data);
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
    });

    const result = await res.json();

    // 성공 시 status/message/result 구조로 반환
    if (res.ok) {
        return {
            status: 201,
            message: "질문이 성공적으로 생성되었습니다.",
            result,
        };
    }
    // 실패 시 백엔드 응답 그대로 반환
    return result;
} 