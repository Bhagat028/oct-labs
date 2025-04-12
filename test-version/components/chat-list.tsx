// components/chat-list.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Trash2, Edit, Check, RefreshCw } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Chat = {
  id: string;
  title: string;
  createdAt: string;
};

// Global chat history cache - persists between component re-renders
let chatHistoryCache: Chat[] = [];
let historyLastFetched = 0;

export function ChatList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(chatHistoryCache.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Extract the current chat ID from the pathname
  const currentChatId = useMemo(() => 
    pathname.startsWith("/chat/") ? pathname.replace("/chat/", "") : null
  , [pathname]);

  const fetchChats = useCallback(async (forceRefresh = false) => {
    // Skip fetching if we already have chats in the global cache and it's not a forced refresh
    if (!forceRefresh && chatHistoryCache.length > 0 && Date.now() - historyLastFetched < 300000) {
      setChats(chatHistoryCache);
      setLoading(false);
      return;
    }
    
    // Show loading/refreshing state
    if (chatHistoryCache.length === 0) {
      setLoading(true);
    }
    
    if (forceRefresh) {
      setRefreshing(true);
    }
    
    try {
      const response = await fetch("/api/chat/history");
      if (!response.ok) throw new Error("Failed to fetch chats");
      const data = await response.json();
      
      // Update both local state and global cache
      setChats(data);
      chatHistoryCache = data;
      historyLastFetched = Date.now();
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Remove dependencies to prevent re-creation of this function

  // Only fetch chat history when component mounts or when forced refresh
  useEffect(() => {
    fetchChats(false);
  }, []); // Empty dependency array - only run on mount

  // Use localUpdate to update a chat in both local state and global cache without refetching
  const localUpdate = useCallback((chatId: string, newData: Partial<Chat>) => {
    const updateChats = (chats: Chat[]) => 
      chats.map(chat => chat.id === chatId ? { ...chat, ...newData } : chat);
    
    setChats(prev => updateChats(prev));
    chatHistoryCache = updateChats(chatHistoryCache);
  }, []);

  const startEditing = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveTitle = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      
      if (!response.ok) throw new Error("Failed to update chat");
      
      // Update the chat in both local state and global cache
      localUpdate(chatId, { title: editTitle.trim() });
    } catch (error) {
      console.error("Error updating chat:", error);
    } finally {
      setEditingId(null);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete chat");
      
      // Update both local state and global cache
      const filteredChats = chats.filter(chat => chat.id !== chatId);
      setChats(filteredChats);
      chatHistoryCache = filteredChats;
      
      // If we deleted the active chat, navigate back to chat home
      if (pathname.includes(chatId)) {
        router.push("/chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const refreshChats = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchChats(true);
  };

  // Use effect to sync local state with global cache when navigating back to the app
  useEffect(() => {
    if (chatHistoryCache.length > 0 && chats.length === 0) {
      setChats(chatHistoryCache);
    }
  }, [chats.length]);

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      {/* Chat History */}
      <div className="overflow-hidden">
        <div className="flex items-center justify-between px-3 mb-1 relative z-10">
          <h3 className="text-xs font-medium text-muted-foreground">Recent Chats</h3>
          <span 
            onClick={refreshChats}
            className={`cursor-pointer text-muted-foreground hover:text-primary ${refreshing ? 'animate-spin' : ''}`}
            aria-label="Refresh chats"
            role="button"
            tabIndex={0}
          >
            <RefreshCw className="h-3 w-3" />
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-pulse">Loading chats...</div>
          </div>
        ) : (
          <SidebarMenu className="overflow-hidden">
            {chats.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No chats yet. Create a new chat to get started.
              </div>
            ) : (
              chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  {editingId === chat.id ? (
                    <div className="flex w-full items-center px-3 py-2" onClick={e => e.stopPropagation()}>
                      <Input 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 h-7"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(chat.id, e as any);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <span 
                        onClick={(e) => saveTitle(chat.id, e)}
                        className="ml-2 cursor-pointer"
                        aria-label="Save chat title"
                        role="button"
                        tabIndex={0}
                      >
                        <Check className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </span>
                    </div>
                  ) : (
                    <SidebarMenuButton 
                      onClick={() => router.push(`/chat/${chat.id}`)}
                      className={`w-full justify-between group ${currentChatId === chat.id ? 'bg-muted' : ''}`}
                      data-active={currentChatId === chat.id}
                    >
                      <span className="truncate">{chat.title}</span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <span 
                          onClick={(e) => startEditing(chat, e)}
                          className="mr-2 cursor-pointer"
                          aria-label="Edit chat title"
                          role="button"
                          tabIndex={0}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </span>
                        <span 
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="cursor-pointer"
                          aria-label="Delete chat"
                          role="button"
                          tabIndex={0}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </span>
                      </div>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        )}
      </div>
    </div>
  );
}
