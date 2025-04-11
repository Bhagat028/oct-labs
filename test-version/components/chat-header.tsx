// components/chat/chat-header.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type ChatHeaderProps = {
  chatId: string;
};

// Global cache for storing chat titles to avoid unnecessary API calls
// This persists between component re-renders and navigation
const chatTitleCache = new Map<string, {
  title: string,
  lastFetched: number
}>();

// Time in ms until title cache is considered stale (10 minutes)
const TITLE_CACHE_TTL = 10 * 60 * 1000;

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const cachedData = chatTitleCache.get(chatId);
  const [title, setTitle] = useState(() => cachedData?.title || "Chat");
  const [loading, setLoading] = useState(!cachedData);
  const previousChatIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Use a callback for fetching chat details to avoid recreating this function on every render
  const fetchChatDetails = useCallback(async (forceFetch = false) => {
    // Check if cache is valid
    const cachedData = chatTitleCache.get(chatId);
    const isCacheValid = cachedData && (Date.now() - cachedData.lastFetched) < TITLE_CACHE_TTL;
    
    // Skip fetching if we're using the same chat or have valid cache
    if (!forceFetch && 
        (chatId === previousChatIdRef.current || isCacheValid)) {
      if (cachedData) {
        setTitle(cachedData.title);
        setLoading(false);
      }
      return;
    }
    
    previousChatIdRef.current = chatId;
    setLoading(!isCacheValid); // Only show loading if cache is invalid
    
    const controller = new AbortController();
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        signal: controller.signal,
      });
      
      if (!response.ok) throw new Error("Failed to fetch chat details");
      
      const data = await response.json();
      // Cache the title for future use
      chatTitleCache.set(chatId, {
        title: data.title,
        lastFetched: Date.now()
      });
      
      setTitle(data.title);
    } catch (error) {
      // Only log errors that aren't from aborting the request
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
      // Use cached data if available
      const cachedData = chatTitleCache.get(chatId);
      if (cachedData) {
        setTitle(cachedData.title);
        // If cache is stale, fetch in background without loading state
        if (Date.now() - cachedData.lastFetched >= TITLE_CACHE_TTL) {
          fetchChatDetails(true);
        }
      } else {
        // If no cache, fetch with loading state
        const abortCleanup = fetchChatDetails(false);
        return () => {
          // Abort any in-flight requests when the component unmounts or chatId changes
          abortCleanup && abortCleanup.then(cleanup => cleanup && cleanup());
        };
      }
    }
  }, [chatId, fetchChatDetails]);

  const deleteChat = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete chat");
      
      // Remove from cache
      chatTitleCache.delete(chatId);
      
      // Navigate to main chat page
      router.push("/chat");
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }, [chatId, router]);

  // Memoize the header UI to prevent unnecessary re-renders
  const headerContent = useMemo(() => (
    <h1 className="text-lg font-medium">
      {loading ? <span className="animate-pulse">Loading...</span> : title}
    </h1>
  ), [loading, title]);

  return (
    <div className="flex items-center justify-between border-b px-4 py-2">
      {headerContent}
      <div className="flex items-center gap-2">
        <button
          onClick={deleteChat}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Delete chat"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Chat options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
