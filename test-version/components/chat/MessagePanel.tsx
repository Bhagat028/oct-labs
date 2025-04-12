// components/chat/MessagePanel.tsx
import React, { useRef, useEffect } from "react";
import { MessageList } from "@/components/message-list";
import { EmptyState, LoadingState } from "@/components/chat/ChatStates";
import { Message } from "@/hooks/useChat";

type MessagePanelProps = {
  messages: Message[];
  loading: boolean;
};

const MemoizedMessageList = React.memo(MessageList);

export function MessagePanel({ messages, loading }: MessagePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto py-6 px-1">
      {loading ? <LoadingState /> : messages.length === 0 ? <EmptyState /> : (
        <MemoizedMessageList messages={messages} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
