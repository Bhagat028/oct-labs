// utils/messageCache.ts
import { Message } from "@/hooks/useChat";

// Time in ms until message cache is considered stale (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
// Maximum number of cached chats to keep in memory
const MAX_CACHE_SIZE = 20;

class MessageCache {
  private cache = new Map<string, {
    messages: Message[],
    lastFetched: number
  }>();
  private accessOrder: string[] = [];

  get(chatId: string) {
    const entry = this.cache.get(chatId);
    if (entry) {
      // Update LRU order (most recently used at the end)
      this.updateAccessOrder(chatId);
    }
    return entry;
  }

  set(chatId: string, messages: Message[]) {
    this.ensureCacheSize();
    
    // Don't update if messages are empty (likely an error)
    if (!messages || !messages.length) {
      console.warn('Attempted to cache empty messages array, skipping');
      return;
    }
    
    this.cache.set(chatId, {
      messages,
      lastFetched: Date.now()
    });
    
    this.updateAccessOrder(chatId);
  }

  isValid(chatId: string): boolean {
    const entry = this.cache.get(chatId);
    if (!entry) return false;
    return (Date.now() - entry.lastFetched) < CACHE_TTL;
  }

  addMessage(chatId: string, message: Message) {
    const entry = this.cache.get(chatId);
    if (entry) {
      // Check for duplicate messages (prevent doubles from optimistic updates)
      const isDuplicate = entry.messages.some(m => 
        m.content === message.content && m.role === message.role
      );
      
      if (!isDuplicate) {
        this.cache.set(chatId, {
          messages: [...entry.messages, message],
          lastFetched: entry.lastFetched
        });
        this.updateAccessOrder(chatId);
      }
    } else {
      // If no entry exists, create a new one with just this message
      this.set(chatId, [message]);
    }
  }
  
  // Clear cache for specific chat or entire cache
  invalidate(chatId?: string) {
    if (chatId) {
      this.cache.delete(chatId);
      this.accessOrder = this.accessOrder.filter(id => id !== chatId);
    } else {
      this.cache.clear();
      this.accessOrder = [];
    }
  }
  
  // Helper to maintain LRU cache behavior
  private updateAccessOrder(chatId: string) {
    // Remove existing reference if any
    this.accessOrder = this.accessOrder.filter(id => id !== chatId);
    // Add to end (most recently used)
    this.accessOrder.push(chatId);
  }
  
  // Ensure cache doesn't exceed max size by removing least recently used entries
  private ensureCacheSize() {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries until we're under the limit
      while (this.cache.size >= MAX_CACHE_SIZE && this.accessOrder.length > 0) {
        const oldest = this.accessOrder.shift();
        if (oldest) {
          this.cache.delete(oldest);
        }
      }
    }
  }
}

export const messageCache = new MessageCache();
