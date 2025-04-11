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
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex items-start gap-3 rounded-lg p-4",
            message.role === "user"
              ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
              : "mr-auto max-w-[80%] bg-muted"
          )}
        >
          {/* Avatar or icon could go here */}
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
            <div className="text-xs opacity-70">
              {new Date(message.createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
