// utils/messageCache.ts
import { Message } from "@/hooks/useChat";

// Time in ms until message cache is considered stale (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

class MessageCache {
  private cache = new Map<string, {
    messages: Message[],
    lastFetched: number
  }>();

  get(chatId: string) {
    return this.cache.get(chatId);
  }

  set(chatId: string, messages: Message[]) {
    this.cache.set(chatId, {
      messages,
      lastFetched: Date.now()
    });
  }

  isValid(chatId: string): boolean {
    const entry = this.cache.get(chatId);
    if (!entry) return false;
    return (Date.now() - entry.lastFetched) < CACHE_TTL;
  }

  addMessage(chatId: string, message: Message) {
    const entry = this.cache.get(chatId);
    if (entry) {
      this.cache.set(chatId, {
        messages: [...entry.messages, message],
        lastFetched: entry.lastFetched
      });
    }
  }
}

export const messageCache = new MessageCache();
