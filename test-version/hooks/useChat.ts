// hooks/useChat.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import { messageService } from "@/services/messageService";
import { messageCache } from "@/utils/messageCache";

export type Message = {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export function useChat(chatId: string) {
  const cachedData = messageCache.get(chatId);
  const [messages, setMessages] = useState<Message[]>(() => cachedData?.messages || []);
  const [loading, setLoading] = useState(!cachedData);
  const [sending, setSending] = useState(false);
  const previousChatIdRef = useRef<string | null>(null);

  // Fetch messages function
  const fetchMessages = useCallback(async (forceFetch = false) => {
    // Skip fetching logic
    const isCacheValid = messageCache.isValid(chatId);
    
    if (!forceFetch && 
        ((chatId === previousChatIdRef.current && !loading) || 
        (isCacheValid && !sending))) {
      if (cachedData) {
        setMessages(cachedData.messages);
        setLoading(false);
      }
      return;
    }
    
    previousChatIdRef.current = chatId;
    setLoading(!isCacheValid);
    
    try {
      const data = await messageService.fetchMessages(chatId);
      messageCache.set(chatId, data);
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [chatId, loading, sending, cachedData]);

  // Initial message loading
  useEffect(() => {
    if (chatId) {
      if (cachedData) {
        setMessages(cachedData.messages);
        if (!messageCache.isValid(chatId)) {
          fetchMessages(true);
        }
      } else {
        fetchMessages(false);
      }
    }
  }, [chatId, fetchMessages, cachedData]);

  // Send message function
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return;
    
    setSending(true);

    try {
      // Create optimistic message
      const optimisticUserMsg: Message = {
        id: `temp-${Date.now()}`,
        chatId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      
      // Update UI optimistically
      setMessages(prev => [...prev, optimisticUserMsg]);
      messageCache.addMessage(chatId, optimisticUserMsg);

      // Get AI response
      const aiResponse = await messageService.getAIResponse(content);

      // Send user message to API
      await messageService.sendUserMessage(optimisticUserMsg);
      
      // Send AI response to API
      await messageService.sendUserMessage({
        role: "assistant",
        content: aiResponse.content,
        chatId,
        id: `temp-${Date.now() + 1}`,
        createdAt: new Date().toISOString(),
      });
      
      // Refresh messages
      const refreshedMessages = await messageService.fetchMessages(chatId);
      messageCache.set(chatId, refreshedMessages);
      setMessages(refreshedMessages);
    } catch (error) {
      console.error('Error in message exchange:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  }, [chatId, sending]);

  return { messages, loading, sending, sendMessage };
}
