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
  const fetchInProgressRef = useRef<boolean>(false);

  // Optimized fetch messages function
  const fetchMessages = useCallback(async (forceFetch = false) => {
    // Prevent concurrent fetches for the same chat
    if (fetchInProgressRef.current) return;
    
    const isCacheValid = messageCache.isValid(chatId);
    
    // Skip fetching logic with improved condition checks
    if (!forceFetch && 
        ((chatId === previousChatIdRef.current && !loading) || 
        (isCacheValid && !sending))) {
      if (cachedData) {
        setMessages(cachedData.messages);
        setLoading(false);
      }
      return;
    }
    
    fetchInProgressRef.current = true;
    previousChatIdRef.current = chatId;
    
    if (!isCacheValid) {
      setLoading(true);
    }
    
    try {
      const data = await messageService.fetchMessages(chatId);
      // Only update if this is still the active chat
      if (chatId === previousChatIdRef.current) {
        messageCache.set(chatId, data);
        setMessages(data);
      }
    } catch (error) {
      console.error(`Error fetching messages for chat ${chatId}:`, error);
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
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

  // Optimized send message function
  const sendMessage = useCallback(async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sending) return;
    
    setSending(true);

    // Create optimistic message
    const optimisticUserMsg: Message = {
      id: `temp-${Date.now()}`,
      chatId,
      role: "user",
      content: trimmedContent,
      createdAt: new Date().toISOString(),
    };
    
    // Update UI optimistically
    setMessages(prev => [...prev, optimisticUserMsg]);
    messageCache.addMessage(chatId, optimisticUserMsg);

    try {
      // Get AI response
      const aiResponse = await messageService.getAIResponse(trimmedContent);

      // Send user message to API
      await messageService.sendUserMessage(optimisticUserMsg);
      
      // Send AI response to API
      await messageService.sendUserMessage({
        role: "assistant",
        content: aiResponse.result,
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
      
      // Rollback optimistic update on error - UI state only
      setMessages(prev => prev.filter(msg => msg.id !== optimisticUserMsg.id));
      
      // Let the next regular fetch handle restoring the cache
      // or fetch immediately to restore proper state
      fetchMessages(true);
      
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  }, [chatId, sending, fetchMessages]);

  return { 
    messages, 
    loading, 
    sending, 
    sendMessage,
    refreshMessages: () => fetchMessages(true)
  };
}
