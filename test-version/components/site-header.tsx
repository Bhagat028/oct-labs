"use client"

import { SidebarIcon, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const router = useRouter()

  const createNewChat = async () => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      
      if (!response.ok) throw new Error("Failed to create chat");
      
      const newChat = await response.json();
      
      // Navigate to the new chat
      router.push(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

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
        <Button
          className="mr-auto"
          size="sm"
          variant="outline"
          onClick={createNewChat}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
        {/* <SearchForm className="w-full sm:ml-auto sm:w-auto" /> */}
      </div>
    </header>
  )
}
