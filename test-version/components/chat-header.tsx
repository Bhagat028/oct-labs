// First, let's fix the ChatTitle component
// components/chat/chat-title.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Global cache for storing chat titles
const chatTitleCache = new Map<string, {
  title: string,
  lastFetched: number
}>();

const TITLE_CACHE_TTL = 10 * 60 * 1000;

type ChatTitleProps = {
  chatId?: string;
}

export function ChatTitle({ chatId }: ChatTitleProps) {
  const cachedData = chatId ? chatTitleCache.get(chatId) : null;
  const [title, setTitle] = useState(() => cachedData?.title || "");
  const [loading, setLoading] = useState(!cachedData && !!chatId);
  const previousChatIdRef = useRef<string | null>(null);

  const fetchChatDetails = useCallback(async (forceFetch = false) => {
    if (!chatId) return;
    
    const cachedData = chatTitleCache.get(chatId);
    const isCacheValid = cachedData && (Date.now() - cachedData.lastFetched) < TITLE_CACHE_TTL;
    
    if (!forceFetch && (chatId === previousChatIdRef.current || isCacheValid)) {
      if (cachedData) {
        setTitle(cachedData.title);
        setLoading(false);
      }
      return;
    }
    
    previousChatIdRef.current = chatId;
    setLoading(!isCacheValid);
    
    const controller = new AbortController();
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        signal: controller.signal,
      });
      
      if (!response.ok) throw new Error("Failed to fetch chat details");
      
      const data = await response.json();
      chatTitleCache.set(chatId, {
        title: data.title,
        lastFetched: Date.now()
      });
      
      setTitle(data.title);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error("Error fetching chat details:", error);
      }
    } finally {
      setLoading(false);
    }
    
    return () => controller.abort();
  }, [chatId]);

  useEffect(() => {
    if (chatId) {
      const cachedData = chatTitleCache.get(chatId);
      if (cachedData) {
        setTitle(cachedData.title);
        if (Date.now() - cachedData.lastFetched >= TITLE_CACHE_TTL) {
          fetchChatDetails(true);
        }
      } else {
        const abortCleanup = fetchChatDetails(false);
        return () => {
          abortCleanup && abortCleanup.then(cleanup => cleanup && cleanup());
        };
      }
    } else {
      setTitle("");
      setLoading(false);
    }
  }, [chatId, fetchChatDetails]);

  if (!chatId) return null;

  return (
    <h1 className="text-lg font-medium">
      {loading ? <span className="animate-pulse">Loading...</span> : title}
    </h1>
  );
}
