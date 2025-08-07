import { Client, IMessage } from '@stomp/stompjs';
import { auth } from '@/lib/auth';
import { ChatMessage, InitChatRoomResponse } from '@/types/chat';

// WebSocket 클라이언트 생성
export const createStompClient = async (onConnect: () => void, onError: (error: any) => void, onClose: () => void): Promise<Client> => {
  // 환경변수에서 WebSocket 주소 조합 (http → ws, https → wss)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
  const wsUrl = `${apiBase.replace(/^http/, 'ws')}/api/${apiVersion}/ws`;
  const token = await auth.getToken();

  const client = new Client({
    brokerURL: wsUrl,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: (str) => console.log(`[STOMP DEBUG] ${str}`),
    connectHeaders: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  client.onConnect = onConnect;
  client.onStompError = onError;
  client.onWebSocketClose = onClose;

  return client;
};

// 메시지 전송
export const sendMessage = (client: Client, chatRoomId: number, message: string, mediaIds: string[] = []) => {
  const chatMessagePayload = {
    message: message.trim(),
    mediaIds,
  };

  client.publish({
    destination: `/app/chatrooms/${chatRoomId}/message`,
    body: JSON.stringify(chatMessagePayload),
  });
};

// 읽음 확인 전송
export const sendReadReceipt = (client: Client, chatRoomId: number, lastReadMessageTime: string) => {
  client.publish({
    destination: `/app/chatrooms/${chatRoomId}/read`,
    body: JSON.stringify({ lastReadMessageTime }),
  });
};

// 초기 메시지 구독
export const subscribeToInitMessages = (
  client: Client, 
  chatRoomId: number, 
  onMessage: (data: InitChatRoomResponse) => void,
  onError: (error: any) => void
) => {
  return client.subscribe(
    `/app/chatrooms/${chatRoomId}/init`, 
    (message: IMessage) => {
      try {
        const data: InitChatRoomResponse = JSON.parse(message.body);
        onMessage(data);
      } catch (error) {
        onError(error);
      }
    }, 
    { 'id': `init-sub-${chatRoomId}` }
  );
};

// 실시간 메시지 구독
export const subscribeToLiveMessages = (
  client: Client, 
  chatRoomId: number, 
  onMessage: (data: ChatMessage) => void,
  onError: (error: any) => void
) => {
  return client.subscribe(
    `/topic/chatrooms/${chatRoomId}/message`, 
    (message: IMessage) => {
      try {
        const data: ChatMessage = JSON.parse(message.body);
        onMessage(data);
      } catch (error) {
        onError(error);
      }
    }, 
    { 'id': `live-sub-${chatRoomId}` }
  );
};

// 읽음 확인 구독
export const subscribeToReadReceipts = (
  client: Client, 
  chatRoomId: number, 
  onMessage: (data: { memberId: number; lastReadMessageTime: string }) => void,
  onError: (error: any) => void
) => {
  return client.subscribe(
    `/topic/chatrooms/${chatRoomId}/read-receipt`, 
    (message: IMessage) => {
      try {
        const data: { memberId: number; lastReadMessageTime: string } = JSON.parse(message.body);
        onMessage(data);
      } catch (error) {
        onError(error);
      }
    }, 
    { 'id': `read-receipt-sub-${chatRoomId}` }
  );
};

// 구독 해제
export const unsubscribeFromChatRoom = (client: Client, chatRoomId: number) => {
  client.unsubscribe(`init-sub-${chatRoomId}`);
  client.unsubscribe(`live-sub-${chatRoomId}`);
  client.unsubscribe(`read-receipt-sub-${chatRoomId}`);
};

// 모든 채팅방 관련 구독 해제
export const unsubscribeFromAllChatRooms = (client: Client) => {
  // STOMP 클라이언트의 구독 목록에 직접 접근할 수 없으므로, 
  // 구독 시 저장한 ID를 기반으로 해제하는 방식으로 변경
  // 실제 구현에서는 구독 ID를 별도로 관리해야 함
  console.log('[WebSocket] Attempting to unsubscribe from all chat rooms');
}; 
