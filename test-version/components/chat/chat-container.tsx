"use client";

import React from "react";
import { useChat } from "@/hooks/useChat";
import { MessagePanel } from "@/components/chat/MessagePanel";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { useSidebar } from "@/components/ui/sidebar";

type ChatContainerProps = {
  chatId: string;
};
export function ChatContainer({ chatId }: ChatContainerProps) {
  const { messages, loading, sending, sendMessage } = useChat(chatId);
  const [sidebarWidth, setSidebarWidth] = React.useState(280); // Default width
  
  React.useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]'); // Add this attribute to your sidebar
    if (!sidebar) return;
    
    const updateWidth = () => {
      setSidebarWidth(sidebar.getBoundingClientRect().width);
    };
    
    // Update once on mount
    updateWidth();
    
    // Add resize observer to track sidebar width changes
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(sidebar);
    
    return () => resizeObserver.disconnect();
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto pb-[80px]">
        <MessagePanel messages={messages} loading={loading} />
      </div>
      
      <div 
        className="fixed bottom-0 right-0 z-10 border-t bg-background"
        style={{ left: `${sidebarWidth}px` }}
      >
        <div className="px-4 lg:px-6">
          <MessageComposer onSendMessage={sendMessage} disabled={sending} />
        </div>
      </div>
    </div>
  );
}
