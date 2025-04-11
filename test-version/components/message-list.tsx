// components/chat/message-list.tsx
import { cn } from "@/lib/utils";

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
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex flex-col rounded-lg p-5",
            message.role === "user"
              ? "bg-primary/5 border border-primary/10"
              : "bg-muted/50"
          )}
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex-shrink-0 size-8 rounded-full flex items-center justify-center text-sm",
              message.role === "user" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted-foreground/20 text-foreground"
            )}>
              {message.role === "user" ? "U" : "A"}
            </div>
            <div className="space-y-2 flex-1">
              <div className="text-sm font-medium">
                {message.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
              <div className="text-xs text-muted-foreground pt-1">
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
