// components/chat-list.tsx
"use client";

import React, { useEffect, useRef, useReducer, useCallback, useMemo } from "react";
import { Trash2, Edit, Check, RefreshCw } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Types
type Chat = {
  id: string;
  title: string;
  createdAt: string;
};

// Action types for reducer
type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'START_LOADING' }
  | { type: 'START_REFRESHING' }
  | { type: 'STOP_LOADING' }
  | { type: 'STOP_REFRESHING' }
  | { type: 'SET_EDITING'; id: string; title: string }
  | { type: 'CLEAR_EDITING' }
  | { type: 'UPDATE_EDIT_TITLE'; title: string }
  | { type: 'UPDATE_CHAT'; id: string; changes: Partial<Chat> }
  | { type: 'DELETE_CHAT'; id: string }
  | { type: 'SET_TRANSITION'; isTransitioning: boolean };

// State type for our reducer
type ChatState = {
  chats: Chat[];
  loading: boolean;
  refreshing: boolean;
  editingId: string | null;
  editTitle: string;
  isTransitioning: boolean;
};

// Global chat history cache - persists between component re-renders
let chatHistoryCache: Chat[] = [];
let historyLastFetched = 0;

// Reducer function to handle all state updates
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'START_LOADING':
      return { ...state, loading: true };
    case 'STOP_LOADING':
      return { ...state, loading: false };
    case 'START_REFRESHING':
      return { ...state, refreshing: true };
    case 'STOP_REFRESHING':
      return { ...state, refreshing: false };
    case 'SET_EDITING':
      return { ...state, editingId: action.id, editTitle: action.title };
    case 'CLEAR_EDITING':
      return { ...state, editingId: null };
    case 'UPDATE_EDIT_TITLE':
      return { ...state, editTitle: action.title };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat => 
          chat.id === action.id ? { ...chat, ...action.changes } : chat
        )
      };
    case 'DELETE_CHAT':
      return {
        ...state,
        chats: state.chats.filter(chat => chat.id !== action.id)
      };
    case 'SET_TRANSITION':
      return { ...state, isTransitioning: action.isTransitioning };
    default:
      return state;
  }
}

// Memoized chat item component to prevent unnecessary re-renders
const ChatItem = React.memo(({
  chat,
  isEditing,
  editTitle,
  isCurrentChat,
  onSaveTitle,
  onTitleChange,
  onStartEditing,
  onCancelEditing,
  onDelete,
  onNavigate,
  onHover
}: {
  chat: Chat;
  isEditing: boolean;
  editTitle: string;
  isCurrentChat: boolean;
  onSaveTitle: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onTitleChange: (value: string) => void;
  onStartEditing: (e: React.MouseEvent) => void;
  onCancelEditing: () => void;
  onDelete: () => void;
  onNavigate: () => void;
  onHover: () => void;
}) => {
  if (isEditing) {
    return (
      <SidebarMenuItem>
        <div className="flex w-full items-center px-3 py-2" onClick={e => e.stopPropagation()}>
          <Input 
            value={editTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="flex-1 h-7"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveTitle(e);
              if (e.key === 'Escape') onCancelEditing();
            }}
          />
          <span 
            onClick={onSaveTitle}
            className="ml-2 cursor-pointer"
            aria-label="Save chat title"
            role="button"
            tabIndex={0}
          >
            <Check className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </span>
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        onClick={onNavigate}
        onMouseEnter={onHover}
        className={`w-full justify-between group ${isCurrentChat ? 'bg-muted' : ''}`}
        data-active={isCurrentChat}
      >
        <span className="truncate">{chat.title}</span>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <span 
            onClick={onStartEditing}
            className="mr-2 cursor-pointer"
            aria-label="Edit chat title"
            role="button"
            tabIndex={0}
          >
            <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <span 
                className="cursor-pointer"
                aria-label="Delete chat"
                role="button"
                tabIndex={0}
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete chat</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this chat? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

ChatItem.displayName = 'ChatItem';

export function ChatList() {
  // Use reducer for more efficient state management
  const [state, dispatch] = useReducer(chatReducer, {
    chats: chatHistoryCache,
    loading: chatHistoryCache.length === 0,
    refreshing: false,
    editingId: null,
    editTitle: "",
    isTransitioning: false
  });
  
  const { chats, loading, refreshing, editingId, editTitle, isTransitioning } = state;
  
  const router = useRouter();
  const pathname = usePathname();
  
  // Container ref for better scroll management
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract the current chat ID from the pathname
  const currentChatId = useMemo(() => 
    pathname.startsWith("/chat/") ? pathname.replace("/chat/", "") : null
  , [pathname]);

  // Optimized fetch chats with caching
  const fetchChats = useCallback(async (forceRefresh = false) => {
    const cacheValid = chatHistoryCache.length > 0 && Date.now() - historyLastFetched < 300000;
    
    // Skip fetching if we have valid cached data and it's not a forced refresh
    if (!forceRefresh && cacheValid) {
      dispatch({ type: 'SET_CHATS', payload: chatHistoryCache });
      dispatch({ type: 'STOP_LOADING' });
      return;
    }
    
    // Set loading states
    if (chatHistoryCache.length === 0) {
      dispatch({ type: 'START_LOADING' });
    }
    
    if (forceRefresh) {
      dispatch({ type: 'START_REFRESHING' });
    }
    
    try {
      const response = await fetch("/api/chat/history");
      if (!response.ok) throw new Error("Failed to fetch chats");
      const data = await response.json();
      
      // Update both local state and global cache
      dispatch({ type: 'SET_CHATS', payload: data });
      chatHistoryCache = data;
      historyLastFetched = Date.now();
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      dispatch({ type: 'STOP_LOADING' });
      dispatch({ type: 'STOP_REFRESHING' });
    }
  }, []);

  // Initialize chat list on mount with optimized loading
  useEffect(() => {
    // Initial load from cache immediately for instant rendering
    if (chatHistoryCache.length > 0) {
      dispatch({ type: 'SET_CHATS', payload: chatHistoryCache });
      dispatch({ type: 'STOP_LOADING' });
    }
    
    // Then fetch in background if needed
    const shouldFetch = chatHistoryCache.length === 0 || 
      Date.now() - historyLastFetched > 300000;
      
    if (shouldFetch) {
      fetchChats(false);
    }
  }, [fetchChats]);

  // Local update utility for chat changes
  const localUpdate = useCallback((chatId: string, changes: Partial<Chat>) => {
    dispatch({ type: 'UPDATE_CHAT', id: chatId, changes });
    
    // Also update the global cache
    chatHistoryCache = chatHistoryCache.map(chat => 
      chat.id === chatId ? { ...chat, ...changes } : chat
    );
  }, []);

  // Optimized navigation with prefetching and transition state
  const navigateToChat = useCallback((chatId: string) => {
    if (currentChatId === chatId) return;
    
    dispatch({ type: 'SET_TRANSITION', isTransitioning: true });
    
    // Use setTimeout to allow transition state to render
    setTimeout(() => {
      router.push(`/chat/${chatId}`, { scroll: false });
      
      // Reset transition state after navigation completes
      setTimeout(() => {
        dispatch({ type: 'SET_TRANSITION', isTransitioning: false });
      }, 300);
    }, 10);
  }, [router, currentChatId]);

  // Chat editing handlers
  const startEditing = useCallback((chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SET_EDITING', id: chat.id, title: chat.title });
  }, []);

  const saveTitle = useCallback(async (chatId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (!editTitle.trim()) {
      dispatch({ type: 'CLEAR_EDITING' });
      return;
    }
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      
      if (!response.ok) throw new Error("Failed to update chat");
      
      // Update the chat locally
      localUpdate(chatId, { title: editTitle.trim() });
    } catch (error) {
      console.error("Error updating chat:", error);
    } finally {
      dispatch({ type: 'CLEAR_EDITING' });
    }
  }, [editTitle, localUpdate]);

  // Delete chat handler
  const deleteChat = useCallback(async (chatId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete chat");
      
      // Update both local state and global cache
      dispatch({ type: 'DELETE_CHAT', id: chatId });
      chatHistoryCache = chatHistoryCache.filter(chat => chat.id !== chatId);
      
      // Navigate away if needed
      if (pathname.includes(chatId)) {
        router.push("/chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  }, [pathname, router]);

  // Refresh chats handler
  const refreshChats = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fetchChats(true);
  }, [fetchChats]);

  // Prefetch chat data on hover
  const prefetchChat = useCallback((chatId: string) => {
    router.prefetch(`/chat/${chatId}`);
  }, [router]);

  // Sync with global cache when navigating back
  useEffect(() => {
    if (chatHistoryCache.length > 0 && chats.length === 0) {
      dispatch({ type: 'SET_CHATS', payload: chatHistoryCache });
    }
  }, [chats.length]);

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      {/* Transition loading indicator */}
      {isTransitioning && (
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 animate-pulse"/>
      )}
      
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
              <div ref={containerRef} className="overflow-auto max-h-[calc(100vh-200px)]">
                {chats.map(chat => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isEditing={editingId === chat.id}
                    editTitle={editTitle}
                    isCurrentChat={currentChatId === chat.id}
                    onSaveTitle={(e) => saveTitle(chat.id, e)}
                    onTitleChange={(value) => dispatch({ type: 'UPDATE_EDIT_TITLE', title: value })}
                    onStartEditing={(e) => startEditing(chat, e)}
                    onCancelEditing={() => dispatch({ type: 'CLEAR_EDITING' })}
                    onDelete={() => deleteChat(chat.id)}
                    onNavigate={() => navigateToChat(chat.id)}
                    onHover={() => prefetchChat(chat.id)}
                  />
                ))}
              </div>
            )}
          </SidebarMenu>
        )}
      </div>
    </div>
  );
}
