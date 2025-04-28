import React from "react";

export const EmptyState = React.memo(() => (
  <div className="flex h-full items-center justify-center text-center">
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-semibold">Let's dive into your data</h3>
      <p className="text-muted-foreground">
        Send a question or prompt to start analyzing and uncover insights.
      </p>
    </div>
  </div>
));

export const LoadingState = React.memo(() => (
  <div className="flex h-full flex-col items-center justify-center text-center space-y-2">
    <div className="animate-pulse text-base font-medium">Analyzing your request...</div>
    <p className="text-sm text-muted-foreground">Fetching relevant insights. Please hold on.</p>
  </div>
));
