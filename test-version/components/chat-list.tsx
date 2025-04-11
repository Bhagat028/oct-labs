// components/chat-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit, Check } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

type Chat = {
  id: string;
  title: string;
  createdAt: string;
};

export function ChatList() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Fetch chat history when component mounts
    const fetchChats = async () => {
      try {
        const response = await fetch("/api/chat/history");
        if (!response.ok) throw new Error("Failed to fetch chats");
        const data = await response.json();
        setChats(data);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
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
      
      // Update the chat in the local state
      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, title: editTitle.trim() } : chat
      ));
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
      
      // Remove from state after successful deletion
      setChats(chats.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Chat History */}
      <div>
        <h3 className="px-3 text-xs font-medium text-muted-foreground">Recent Chats</h3>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-pulse">Loading chats...</div>
          </div>
        ) : (
          <SidebarMenu>
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
                      <button 
                        onClick={(e) => saveTitle(chat.id, e)}
                        className="ml-2"
                        aria-label="Save chat title"
                      >
                        <Check className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  ) : (
                    <SidebarMenuButton 
                      onClick={() => router.push(`/chat/${chat.id}`)}
                      className="w-full justify-between group"
                    >
                      <span className="truncate">{chat.title}</span>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => startEditing(chat, e)}
                          className="mr-2"
                          aria-label="Edit chat title"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </button>
                        <button 
                          onClick={(e) => deleteChat(chat.id, e)}
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
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
