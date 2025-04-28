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
  const [loading, setLoading] = useState(!cachedData?.messages?.length);
  const [sending, setSending] = useState(false);
  const previousChatIdRef = useRef<string | null>(null);
  const fetchInProgressRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimized fetch messages function with debouncing and request cancellation
  const fetchMessages = useCallback(async (forceFetch = false) => {
    // Clear any pending debounced fetches
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Cancel any in-flight requests when switching chats or forcing fetch
    if (forceFetch && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Debounce function to prevent multiple rapid fetch requests
    return new Promise<void>((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        // Prevent concurrent fetches for the same chat
        if (fetchInProgressRef.current && !forceFetch) {
          resolve();
          return;
        }
        
        const isCacheValid = messageCache.isValid(chatId);
        
        // Use cache immediately if available (optimistic rendering)
        if (cachedData?.messages?.length && !forceFetch) {
          setMessages(cachedData.messages);
          
          // If cache is valid and we're not forcing a fetch, we can stop here
          if (isCacheValid && !sending) {
            setLoading(false);
            resolve();
            return;
          }
        }
        
        // Only show loading indicator if we don't have any messages to display
        if (!messages.length && !isCacheValid) {
          setLoading(true);
        }
        
        // Skip fetch if this is just a chat switch and we already have cached data
        if (!forceFetch && 
            chatId === previousChatIdRef.current && 
            cachedData?.messages?.length) {
          setLoading(false);
          resolve();
          return;
        }
        
        fetchInProgressRef.current = true;
        previousChatIdRef.current = chatId;
        
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        
        try {
          const data = await messageService.fetchMessages(chatId, {
            signal: abortControllerRef.current.signal
          });
          
          // Only update if this is still the active chat
          if (chatId === previousChatIdRef.current) {
            messageCache.set(chatId, data);
            setMessages(data);
          }
        } catch (error: any) {
          // Don't log aborted requests as errors
          if (error.name !== 'AbortError') {
            console.error(`Error fetching messages for chat ${chatId}:`, error);
          }
        } finally {
          setLoading(false);
          fetchInProgressRef.current = false;
          resolve();
        }
      }, forceFetch ? 0 : 100); // No delay for forced fetches, small delay for regular ones
    });
  }, [chatId, sending, cachedData, messages.length]);

  // Initial message loading - with immediate cache use
  useEffect(() => {
    if (chatId) {
      // First set from cache immediately if available (no loading state)
      if (cachedData?.messages?.length) {
        setMessages(cachedData.messages);
        setLoading(false);
      }
      
      // Then determine if we need to fetch fresh data
      if (!messageCache.isValid(chatId) || !cachedData?.messages?.length) {
        fetchMessages(false);
      }
      
      // Prefetch on chat switch
      if (previousChatIdRef.current !== chatId) {
        previousChatIdRef.current = chatId;
      }
    }
    
    // Cleanup function to cancel pending requests when unmounting or changing chats
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
      
      // Create optimistic AI message
      const optimisticAiMsg: Message = {
        id: `temp-${Date.now() + 1}`,
        chatId,
        role: "assistant",
        content: aiResponse.result,
        createdAt: new Date().toISOString(),
      };
      
      // Update UI with AI response immediately
      setMessages(prev => [...prev, optimisticAiMsg]);
      messageCache.addMessage(chatId, optimisticAiMsg);

      // Send user message to API (in background)
      await Promise.all([
        messageService.sendUserMessage(optimisticUserMsg),
        messageService.sendUserMessage(optimisticAiMsg)
      ]);
      
      // Refresh messages in background without loading state
      const refreshedMessages = await messageService.fetchMessages(chatId);
      messageCache.set(chatId, refreshedMessages);
      setMessages(refreshedMessages);
    } catch (error) {
      console.error('Error in message exchange:', error);
      
      // Rollback optimistic update on error - UI state only
      setMessages(prev => prev.filter(msg => msg.id !== optimisticUserMsg.id));
      
      // Let the next regular fetch handle restoring the cache
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
