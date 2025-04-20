import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type MessageListProps = {
  messages: Message[];
};

export function MessageList({ messages }: MessageListProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4">
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={cn(
            "flex w-full",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "flex flex-col max-w-[85%] rounded-2xl shadow-sm",
              message.role === "user"
                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-none"
                : "bg-gradient-to-br from-muted/80 to-muted rounded-tl-none border border-border/30"
            )}
          >
            <div className="flex items-start gap-3 p-4">
              <div className={cn(
                "flex-shrink-0 size-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm",
                message.role === "user" 
                  ? "bg-primary-foreground text-primary" 
                  : "bg-background text-foreground"
              )}>
                {message.role === "user" ? "You" : "AI"}
              </div>
              <div className="space-y-2 flex-1 pt-1">
                <div className="text-sm font-semibold tracking-tight">
                  {message.role === "user" ? "You" : "Assistant"}
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
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
}
