"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SendIcon } from "lucide-react"

const ChatInput = ({ onSendMessage }: { onSendMessage: (message: string) => void }) => {
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input)
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex w-full items-center space-x-2 p-4 border-t">
      <Input
        placeholder="Type your message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1"
        autoComplete="off"
      />
      <Button 
        onClick={handleSend} 
        size="icon" 
        disabled={!input.trim()}
        aria-label="Send message"
      >
        <SendIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default ChatInput
