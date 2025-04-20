"use client"

import { SidebarIcon, Plus } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { ChatTitle } from "@/components/chat-header"
import DatabaseUrlStorage from "@/components/settings"
export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()
  
  // Extract chat ID from the URL path
  const chatId = pathname?.match(/\/chat\/([^\/]+)/)?.[1] || undefined

  const createNewChat = async () => {
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
    }
  }

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b shadow-sm shrink-0">
      <div className="flex h-[var(--header-height)] w-full items-center justify-between px-2 sm:px-4">
        {/* Left section */}
        <div className="flex items-center gap-1 sm:gap-2 z-10">
          <Button
            className="h-7 w-7 sm:h-8 sm:w-8"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <SidebarIcon className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Button 
            className="text-xs sm:text-sm px-2 sm:px-3" 
            size="sm" 
            variant="outline" 
            onClick={createNewChat}
          >
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
        
        {/* Center section - chat title */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <div className="pointer-events-auto max-w-[40%] sm:max-w-[50%] truncate">
            <ChatTitle chatId={chatId} />
          </div>
        </div>
        
        {/* Right section */}
        <DatabaseUrlStorage />
      </div>
    </header>
  )
}
