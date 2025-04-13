"use client"

import { SidebarIcon, Plus } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { ChatTitle } from "@/components/chat-header"

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
      <div className="flex h-[var(--header-height)] w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Button className="mr-auto" size="sm" variant="outline" onClick={createNewChat}>
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
        
        {/* Center the chat title */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <ChatTitle chatId={chatId} />
          </div>
        </div>
      </div>
    </header>
  )
}
