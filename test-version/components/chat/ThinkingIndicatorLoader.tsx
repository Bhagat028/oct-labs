// components/chat/ThinkingIndicator.tsx
import React from "react";

export const ThinkingIndicator = () => (
  <div className="flex items-start gap-3 py-3 px-4">
    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary/10 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        className="h-5 w-5"
        fill="currentColor"
      >
        <path d="M128 24a104 104 0 10104 104A104.11 104.11 0 00128 24zm0 192a88 88 0 1188-88 88.1 88.1 0 01-88 88z" />
      </svg>
    </div>
    <div className="rounded-md border bg-muted p-3">
      <div className="flex items-center">
        <span className="text-sm">Thinking</span>
        <span className="dots-animation">
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
      </div>
    </div>
  </div>
);
