// components/chat/ChatStates.tsx
import React from "react";

export const EmptyState = React.memo(() => (
  <div className="flex h-full items-center justify-center text-center">
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-medium">Start a conversation</h3>
      <p className="text-muted-foreground">
        Send a message to begin chatting with the assistant.
      </p>
    </div>
  </div>
));

export const LoadingState = React.memo(() => (
  <div className="flex h-full items-center justify-center">
    <div className="animate-pulse">Loading conversation...</div>
  </div>
));
