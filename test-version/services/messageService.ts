// services/messageService.ts
import { Message } from "@/hooks/useChat";

// Simple cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache lifetime

/**
 * Enhanced fetch with timeout, caching, and better error handling
 */
async function enhancedFetch<T>(
  url: string,
  options: RequestInit & { 
    timeout?: number;
    useCache?: boolean;
  } = {}
): Promise<T> {
  const { 
    timeout = 10000, 
    useCache = false,
    ...fetchOptions 
  } = options;
  
  // Check cache for GET requests
  const cacheKey = `${url}-${JSON.stringify(fetchOptions)}`;
  if (useCache && !fetchOptions.method || fetchOptions.method === 'GET') {
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
  }
  
  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers
      },
      signal: controller.signal
    });
    
    // Process the response
    let data: any;
    
    // Check for non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status: ${response.status}`);
    }
    
    // Parse JSON response
    data = await response.json();
    
    // Cache successful GET responses
    if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    
    // Enhance error with more context
    throw new Error(`API error: ${error.message || 'Unknown error'}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const messageService = {
  /**
   * Fetch messages for a specific chat
   */
  async fetchMessages(chatId: string): Promise<Message[]> {
    return enhancedFetch<Message[]>(`/api/chat/${chatId}/messages`, {
      useCache: true // Enable caching for message fetching
    });
  },
  
  /**
   * Send a user message
   */
  async sendUserMessage(message: Partial<Message>): Promise<void> {
    await enhancedFetch<void>(`/api/chat/${message.chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(message)
    });
    
    // Invalidate cache after sending a message
    this.invalidateCache(message.chatId as string);
  },
  
  /**
   * Get AI response for a message
   */
  async getAIResponse(message: string, options?: { timeout?: number }): Promise<any> {
    return enhancedFetch(`/api/research`, {
      method: "POST",
      body: JSON.stringify({ question: message }),
      timeout: options?.timeout || 30000 // Longer default timeout for AI responses
    });
  },
  
  /**
   * Invalidate cache for a specific chat
   */
  invalidateCache(chatId?: string): void {
    if (chatId) {
      // Remove specific chat entries
      const cacheKeyPrefix = `/api/chat/${chatId}`;
      
      // Find and remove all matching cache entries
      for (const key of cache.keys()) {
        if (key.startsWith(cacheKeyPrefix)) {
          cache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      cache.clear();
    }
  }
};
