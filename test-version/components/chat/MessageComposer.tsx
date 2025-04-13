// components/chat/MessageComposer.tsx
import React from "react";
import { MessageInput } from "@/components/message-input";


/*

src/
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx              # Main container (simplified)
│   │   ├── MessagePanel.tsx               # Displays messages
│   │   ├── ChatStates.tsx                 # Empty and loading states
│   │   └── MessageComposer.tsx            # Message input area
│   ├── message-list.tsx                   # Already exists
│   └── message-input.tsx                  # Already exists
├── hooks/
│   └── useChat.tsx                        # Chat logic and state management
├── services/
│   └── messageService.ts                  # API interaction layer
└── utils/
    └── messageCache.ts                    # Cache implementation


*/
type MessageComposerProps = {
  onSendMessage: (content: string) => Promise<void>;
  disabled: boolean;
};

export const MessageComposer = React.memo(({ onSendMessage, disabled }: MessageComposerProps) => {
  return (
    <div className="max-w-3xl mx-auto">
      <MessageInput onSendMessage={onSendMessage} disabled={disabled} />
    </div>
  );
});
