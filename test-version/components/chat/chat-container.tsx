// components/chat/ChatContainer.tsx
"use client";

import React from "react";
import { useChat } from "@/hooks/useChat";
import { MessagePanel } from "@/components/chat/MessagePanel";
import { MessageComposer } from "@/components/chat/MessageComposer";

type ChatContainerProps = {
  chatId: string;
};

export function ChatContainer({ chatId }: ChatContainerProps) {
  const { messages, loading, sending, sendMessage } = useChat(chatId);

  return (
    <div className="flex h-full flex-col">
      <MessagePanel messages={messages} loading={loading} />
      <MessageComposer onSendMessage={sendMessage} disabled={sending} />
    </div>
  );
}
