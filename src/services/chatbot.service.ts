import { apiClient } from "@/lib/api";

export interface ChatRequestPayload {
  message: string;
  conversationId?: string;
  userId?: string;
}

export interface ChatResponse {
  response: string;
  conversationId: string;
  timestamp: string;
  isMedicalAdvice: boolean;
  disclaimer?: string;
}

export const chatbotService = {
  /** Gửi tin nhắn tới trợ lý ảo AI tư vấn */
  async sendMessage(payload: ChatRequestPayload): Promise<ChatResponse> {
    const res = await apiClient.post<ChatResponse>("/ai-chatbot/chat", payload);
    return res.data;
  },

  /** Lấy lời khuyên sức khỏe theo chuyên mục */
  async getHealthTips(category?: string): Promise<ChatResponse> {
    const res = await apiClient.get<ChatResponse>("/ai-chatbot/health-tips", {
      params: { category },
    });
    return res.data;
  },
};
