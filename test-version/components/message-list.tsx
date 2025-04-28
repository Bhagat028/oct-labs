import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useEffect, memo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

// Memoized message component to prevent unnecessary re-renders
const MessageBubble = memo(({ message, isLatest }: { message: Message; isLatest: boolean }) => {
  const isUser = message.role === "user";
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Apply focus to the latest message for accessibility
  useEffect(() => {
    if (isLatest && !isUser) {
      bubbleRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLatest, isUser]);
  
  const handleImageError = (src: string) => {
    setImageErrors(prev => ({ ...prev, [src]: true }));
  };
  
  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
      tabIndex={isLatest ? 0 : -1}
      aria-label={`${isUser ? "Your" : "Assistant's"} message from ${new Date(message.createdAt).toLocaleTimeString()}`}
    >
      <div
        className={cn(
          "flex flex-col",
          isUser
            ? "max-w-[85%] rounded-2xl shadow-sm bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-none"
            : "max-w-[90%] text-foreground"
        )}
      >
        <div className={cn(
          "flex items-start gap-3 p-4",
          !isUser && "px-2"
        )}>
          {isUser ? (
            <div 
              className="flex-shrink-0 size-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm bg-primary-foreground text-primary"
              aria-hidden="true"
            >
              You
            </div>
          ) : (
            <div 
              className="flex-shrink-0 size-10 rounded-full flex items-center justify-center text-sm font-medium bg-muted/40 text-foreground/80"
              aria-hidden="true"
            >
              AI
            </div>
          )}
          <div className="space-y-2 flex-1 pt-1">
            <div className={cn(
              "text-sm font-semibold tracking-tight",
              !isUser && "text-foreground/80"
            )}>
              {isUser ? "You" : "Assistant"}
            </div>
            <div 
              className={cn(
                "prose max-w-none text-[15px] leading-relaxed [&>*:not(:first-child)]:mt-3 break-words",
                isUser ? "prose-invert" : "prose-neutral dark:prose-invert"
              )}
            >
              <ReactMarkdown 
                components={{
                  img: ({ src, alt, ...props }) => {
                    if (!src || imageErrors[src]) {
                      return <span className="text-muted-foreground">[Image unavailable]</span>;
                    }
                    return <img 
                      src={src} 
                      alt={alt || "Image in conversation"} 
                      className="rounded-md max-w-full my-2" 
                      onError={() => src && handleImageError(src)}
                      loading="lazy"
                      {...props} 
                    />;
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            <div className={cn(
              "text-[11px] pt-1 font-medium",
              isUser ? "opacity-70" : "text-foreground/50"
            )}>
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
      {messages.map((message, index) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
          isLatest={index === messages.length - 1}
        />
      ))}
      <div ref={endOfMessagesRef} aria-hidden="true" />
    </div>
  );
}

export default MessageList;
