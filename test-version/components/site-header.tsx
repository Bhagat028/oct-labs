"use client"

import { useCallback, useMemo, useState } from "react"
import { SidebarIcon, Plus, Loader2 } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { ChatTitle } from "@/components/chat-header"
import DatabaseUrlStorage from "@/components/settings"
import { useMediaQuery } from "@/hooks/use-media-query"; // You'll need to create this hook
// Custom hook for chat creation with loading state
function useNewChat() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  
  const createNewChat = useCallback(async () => {
    if (isCreating) return
    
    setIsCreating(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      })
      
      if (!response.ok) throw new Error("Failed to create chat")

      const newChat = await response.json()
      router.push(`/chat/${newChat.id}`)
    } catch (error) {
      console.error("Error creating chat:", error)
    } finally {
      setIsCreating(false)
    }
  }, [router, isCreating])
  
  return { createNewChat, isCreating }
}

export function SiteHeader() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const { createNewChat, isCreating } = useNewChat()
  
  // Extract chat ID from the URL path using memoization
  const chatId = useMemo(() => {
    return pathname?.match(/\/chat\/([^\/]+)/)?.[1] || undefined
  }, [pathname])

  return (
    <header className="bg-background sticky top-0 z-50 w-full border-b shadow-sm">
      <div className="flex items-center h-[var(--header-height)] px-2 sm:px-4">
        {/* Left Section */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <SidebarIcon className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-0.5 hidden sm:block" />
          <Button 
            size="sm" 
            variant="outline" 
            onClick={createNewChat}
            disabled={isCreating}
            className="gap-1"
            aria-label="New Chat"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
        
        {/* Middle Section - Chat Title */}
        <div className="flex-1 mx-2 overflow-hidden text-center">
          {chatId && (
            <div className="max-w-full truncate">
              <ChatTitle chatId={chatId} />
            </div>
          )}
        </div>
        
        <div className="block md:hidden">
  {/* Plus button for small screens */}
  <button className="p-2 rounded-full bg-primary text-primary-foreground" aria-label="Add database">
    <Plus className="h-4 w-4" />
  </button>
</div>

{/* Right Section - Database Controls */}
<div className="flex items-center">
  <div className="block md:hidden">
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 rounded-full hover:bg-muted"
      onClick={() => {
        // Add the same functionality as DatabaseUrlStorage click handler
        // For example: openDatabaseSettings()
      }}
      aria-label="Database settings"
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>

  <div className="hidden md:block">
    <DatabaseUrlStorage />
  </div>
</div>

      </div>
    </header>
  )
}
