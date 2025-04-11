// components/chat/chat-container.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";

type Message = {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ChatContainerProps = {
  chatId: string;
};

// Global cache for storing messages to avoid unnecessary API calls
// This persists between component re-renders and navigation
const messageCache = new Map<string, {
  messages: Message[],
  lastFetched: number
}>();

// Time in ms until message cache is considered stale (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Memoize the MessageList component to prevent unnecessary re-renders
const MemoizedMessageList = React.memo(MessageList);

export function ChatContainer({ chatId }: ChatContainerProps) {
  const cachedData = messageCache.get(chatId);
  const [messages, setMessages] = useState<Message[]>(() => cachedData?.messages || []);
  const [loading, setLoading] = useState(!cachedData);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousChatIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Fetch messages when chat ID changes
  const fetchMessages = useCallback(async (forceFetch = false) => {
    // Skip fetching if we're just sending a message to the same chat
    const cachedData = messageCache.get(chatId);
    const isCacheValid = cachedData && (Date.now() - cachedData.lastFetched) < CACHE_TTL;
    
    if (!forceFetch && 
        ((chatId === previousChatIdRef.current && !loading) || 
        (isCacheValid && !sending))) {
      // Use cached data if available and valid
      if (cachedData) {
        setMessages(cachedData.messages);
        setLoading(false);
      }
      return;
    }
    
    previousChatIdRef.current = chatId;
    setLoading(!isCacheValid); // Only show loading if we don't have a valid cache
    
    const controller = new AbortController();
    
    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error("Failed to fetch messages");
      
      const data = await response.json();
      
      // Cache the messages for future use
      messageCache.set(chatId, {
        messages: data,
        lastFetched: Date.now()
      });
      
      setMessages(data);
    } catch (error) {
      // Only log errors that aren't from aborting the request
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error("Error fetching messages:", error);
      }
    } finally {
      setLoading(false);
    }
    
    return () => controller.abort();
  }, [chatId, loading, sending]);

  // Use effect to fetch messages when chat ID changes
  useEffect(() => {
    if (chatId) {
      // First set messages from cache immediately if available
      const cachedData = messageCache.get(chatId);
      if (cachedData) {
        setMessages(cachedData.messages);
        // If cache is stale, fetch in background without loading state
        if (Date.now() - cachedData.lastFetched >= CACHE_TTL) {
          fetchMessages(true);
        }
      } else {
        // If no cache, fetch with loading state
        const abortCleanup = fetchMessages(false);
        return () => {
          // Clean up any pending requests when unmounting or changing chats
          abortCleanup && abortCleanup.then(cleanup => cleanup && cleanup());
        };
      }
    }
  }, [chatId, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || sending) return;
    
    setSending(true);

    try {
      // Add user message to UI immediately for better UX
      const optimisticUserMsg = {
        id: `temp-${Date.now()}`,
        chatId,
        role: "user" as const,
        content,
        createdAt: new Date().toISOString(),
      };
      
      // Update both local state and cache with optimistic message
      setMessages(prev => [...prev, optimisticUserMsg]);
      const currentCache = messageCache.get(chatId);
      if (currentCache) {
        messageCache.set(chatId, {
          messages: [...currentCache.messages, optimisticUserMsg],
          lastFetched: currentCache.lastFetched
        });
      }
      
      // Send user message to API
      const userMsgResponse = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content }),
      });
      
      if (!userMsgResponse.ok) throw new Error("Failed to send message");
      
      // Request AI response
      const assistantMsgResponse = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "assistant", content: "I'm processing your request..." }),
      });
      
      if (!assistantMsgResponse.ok) throw new Error("Failed to get AI response");
      
      // Refresh messages to get the actual responses from the server
      const refreshResponse = await fetch(`/api/chat/${chatId}/messages`);
      if (!refreshResponse.ok) throw new Error("Failed to refresh messages");
      
      const refreshedMessages = await refreshResponse.json();
      
      // Update the cache with the latest messages
      messageCache.set(chatId, {
        messages: refreshedMessages,
        lastFetched: Date.now()
      });
      
      setMessages(refreshedMessages);
      
    } catch (error) {
      console.error("Error in message exchange:", error);
    } finally {
      setSending(false);
    }
  }, [chatId, sending]);

  // Memoize the empty state to prevent unnecessary re-renders
  const emptyState = useMemo(() => (
    <div className="flex h-full items-center justify-center text-center">
      <div className="max-w-md space-y-4">
        <h3 className="text-lg font-medium">Start a conversation</h3>
        <p className="text-muted-foreground">
          Send a message to begin chatting with the assistant.
        </p>
      </div>
    </div>
  ), []);

  // Memoize the loading state to prevent unnecessary re-renders
  const loadingState = useMemo(() => (
    <div className="flex h-full items-center justify-center">
      <div className="animate-pulse">Loading conversation...</div>
    </div>
  ), []);

  return (
    <div className="flex h-full flex-col">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto py-6 px-1">
        {loading ? loadingState : messages.length === 0 ? emptyState : (
          <MemoizedMessageList messages={messages} />
        )}
        <div ref={bottomRef} />
      </div>
      
      {/* Message input */}
      <div className="border-t py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <MessageInput onSendMessage={sendMessage} disabled={sending} />
        </div>
      </div>
    </div>
  );
}
