import { Message } from "@/hooks/useChat";

// Enhanced cache implementation with LRU-like behavior
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly maxSize = 100; // Maximum cache entries
  private readonly defaultTTL = 60000; // 1 minute default TTL
  
  // In-flight requests tracking to prevent duplicate API calls
  private pendingRequests = new Map<string, Promise<any>>();

  get(key: string, ttl = this.defaultTTL): { data: any; fresh: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const fresh = (Date.now() - entry.timestamp) < ttl;
    return { data: entry.data, fresh };
  }

  set(key: string, data: any): void {
    // LRU-like behavior: Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    // Add to cache and move to "newest" position
    this.cache.delete(key); // Remove if exists
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Register an in-flight request
  registerRequest(key: string, promise: Promise<any>): Promise<any> {
    this.pendingRequests.set(key, promise);
    
    // Clean up after completion
    return promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  // Check if a request is already in flight
  hasPendingRequest(key: string): Promise<any> | undefined {
    return this.pendingRequests.get(key);
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Remove matching entries
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const apiCache = new ApiCache();

/**
 * Enhanced fetch with optimizations for performance
 */
async function enhancedFetch<T>(
  url: string,
  options: RequestInit & { 
    timeout?: number;
    useCache?: boolean;
    cacheTTL?: number;
    retries?: number;
  } = {}
): Promise<T> {
  const { 
    timeout = 10000, 
    useCache = false,
    cacheTTL = 60000,
    retries = 2,
    ...fetchOptions 
  } = options;
  
  // Generate a consistent cache key
  const method = fetchOptions.method || 'GET';
  const cacheKey = `${method}-${url}-${
    fetchOptions.body ? hashString(fetchOptions.body.toString()) : ''
  }`;
  
  // Return cached data for GET/HEAD if available and requested
  if (useCache && (method === 'GET' || method === 'HEAD')) {
    const cachedResult = apiCache.get(cacheKey, cacheTTL);
    
    if (cachedResult?.fresh) {
      return cachedResult.data;
    }
    
    // Check for in-flight requests to avoid duplicates
    const pendingRequest = apiCache.hasPendingRequest(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }
  }
  
  // Create fetch promise with timeout
  const fetchWithTimeout = async (attempt = 0): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers
        },
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message;
        } catch {
          errorMessage = errorText || `Status: ${response.status}`;
        }
        
        throw new Error(`API Error: ${errorMessage}`);
      }
      
      // Efficiently handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return (undefined as unknown) as T;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        // Cache successful GET/HEAD responses
        if (useCache && (method === 'GET' || method === 'HEAD')) {
          apiCache.set(cacheKey, data);
        }
        
        return data;
      } else {
        // Handle non-JSON responses if needed
        const text = await response.text();
        return (text as unknown) as T;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      
      // Implement retry logic with exponential backoff
      if (attempt < retries) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return fetchWithTimeout(attempt + 1);
      }
      
      throw new Error(`API error: ${error.message || 'Unknown error'}`);
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  // Register this request to prevent duplicates
  const fetchPromise = fetchWithTimeout();
  if (useCache && (method === 'GET' || method === 'HEAD')) {
    return apiCache.registerRequest(cacheKey, fetchPromise);
  }
  
  return fetchPromise;
}

// Simple string hashing function for cache keys
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export const messageService = {
  /**
   * Fetch messages for a specific chat
   */
  async fetchMessages(chatId: string, options?: { signal?: AbortSignal }): Promise<Message[]> {
    return enhancedFetch<Message[]>(`/api/chat/${chatId}/messages`, {
      useCache: true,
      cacheTTL: 30000, // 30 seconds TTL for messages
      ...(options?.signal && { signal: options.signal })
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
      timeout: options?.timeout || 30000, // Longer default timeout for AI responses
      retries: 1 // Only retry once for AI responses
    });
  },
  
  /**
   * Invalidate cache for a specific chat
   */
  invalidateCache(chatId?: string): void {
    if (chatId) {
      apiCache.invalidate(`/api/chat/${chatId}`);
    } else {
      apiCache.invalidate();
    }
  },
  
  /**
   * Prefetch messages for a chat (useful for preloading data)
   */
  prefetchMessages(chatId: string): void {
    this.fetchMessages(chatId).catch(err => 
      console.warn(`Failed to prefetch messages for chat ${chatId}:`, err)
    );
  }
};
