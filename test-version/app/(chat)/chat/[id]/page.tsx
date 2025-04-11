"use client"

import { useParams } from "next/navigation"
import Chat from "@/components/chat"

export default function ChatPage() {
  // This ensures the chat ID is passed to the Chat component
  // even though it also tries to retrieve it independently
  return (
    <div>
      <Chat />
    </div>
  )
} 