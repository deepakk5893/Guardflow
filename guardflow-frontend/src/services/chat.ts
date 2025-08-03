import { ApiService } from './api';

// Chat service interfaces
export interface ChatMessage {
  id: string;
  content: string;
  is_user: boolean;
  tokens_used: number;
  intent?: string;
  created_at: string;
}

export interface Chat {
  id: string;
  title: string;
  task_id?: number;
  total_tokens_used: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatWithMessages extends Chat {
  messages: ChatMessage[];
}

export interface TaskContext {
  id: number;
  title: string;
  description: string;
  category: string;
  token_limit: number;
}

export interface SendMessageRequest {
  chat_id: string;
  content: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  response: ChatMessage;
  remaining_tokens: number;
  chat_updated: Chat;
}

export interface CreateChatRequest {
  task_id: number;
  title?: string;
}

class ChatService extends ApiService {
  
  // Create a new chat for a task
  async createChat(request: CreateChatRequest): Promise<Chat> {
    return this.post<Chat>('/chats/new', request);
  }

  // Get all user chats, optionally filtered by task
  async getUserChats(taskId?: number): Promise<Chat[]> {
    const endpoint = taskId ? `/chats?task_id=${taskId}` : '/chats';
    return this.get<Chat[]>(endpoint);
  }

  // Get specific chat with all messages
  async getChatWithMessages(chatId: string): Promise<ChatWithMessages> {
    return this.get<ChatWithMessages>(`/chats/${chatId}`);
  }

  // Send a message and get AI response
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    return this.post<SendMessageResponse>('/chats/send', request);
  }

  // Get task context for chat creation
  async getTaskContext(taskId: number): Promise<TaskContext> {
    return this.get<TaskContext>(`/chats/task/${taskId}/context`);
  }

  // Get or create chat for a specific task (one chat per task)
  async getOrCreateChatForTask(taskId: number): Promise<Chat> {
    return this.get<Chat>(`/chats/task/${taskId}`);
  }

  // Archive a chat (soft delete)
  async archiveChat(chatId: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/chats/${chatId}`);
  }
}

export const chatService = new ChatService();