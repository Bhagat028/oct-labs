/**
 * Utility functions for database connection management
 */

/**
 * Fetches the database URL from the API
 * 
 * @returns The database URL if successful, null otherwise
 */
export async function fetchDatabaseUrl(): Promise<string | null> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // In Next.js, we can use relative URLs for API routes
    const response = await fetch('/api/get-db-url', {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies with the request
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.url) {
      return data.url;
    } else {
      console.error('Failed to get database URL:', data.error || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error fetching database URL:', error);
    return null;
  }
} 