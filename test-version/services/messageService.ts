// services/messageService.ts
import { Message } from "@/hooks/useChat";

export const messageService = {
  async fetchMessages(chatId: string): Promise<Message[]> {
    const response = await fetch(`/api/chat/${chatId}/messages`);
    
    if (!response.ok) throw new Error("Failed to fetch messages");
    
    return response.json();
  },
  
  async sendUserMessage(message: Partial<Message>): Promise<void> {
    const response = await fetch(`/api/chat/${message.chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) throw new Error("Failed to send message");
  },
  
  async getAIResponse(message: string): Promise<any> {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    return response.json();
  }
};
