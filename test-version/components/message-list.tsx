import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

// Memoized message component to prevent unnecessary re-renders
const MessageBubble = memo(({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex flex-col max-w-[85%] rounded-2xl shadow-sm",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-none"
            : "bg-gradient-to-br from-muted/80 to-muted rounded-tl-none border border-border/30"
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div 
            className={cn(
              "flex-shrink-0 size-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm",
              isUser 
                ? "bg-primary-foreground text-primary" 
                : "bg-background text-foreground"
            )}
            aria-hidden="true"
          >
            {isUser ? "You" : "AI"}
          </div>
          <div className="space-y-2 flex-1 pt-1">
            <div className="text-sm font-semibold tracking-tight">
              {isUser ? "You" : "Assistant"}
            </div>
            <div className="prose prose-base dark:prose-invert max-w-none text-[15px] leading-relaxed [&>*:not(:first-child)]:mt-3">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            <div className="text-[11px] opacity-70 pt-1 font-medium">
              {new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

type MessageListProps = {
  messages: Message[];
};

export function MessageList({ messages }: MessageListProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  
  // Only scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages.length]);

  return (
    <div 
      className="space-y-6 max-w-3xl mx-auto px-4"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endOfMessagesRef} aria-hidden="true" />
    </div>
  );
}

export default MessageList;
