// components/chat/message-input.tsx
import { useState, FormEvent } from "react";
import { Send } from "lucide-react";

type MessageInputProps = {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
};

export function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="overflow-hidden rounded-xl border border-input bg-background/90 backdrop-blur-sm shadow-md focus-within:ring-1 focus-within:ring-primary">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message Oct..."
          className="w-full resize-none bg-transparent px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none pr-12"
          disabled={disabled}
        />
        <button
          type="submit"
          className="absolute right-2 bottom-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          disabled={!message.trim() || disabled}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </button>
      </div>
    </form>
  );
}
