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

    // Check if we're in a browser or Node.js environment
    const isServer = typeof window === 'undefined';
    // Use absolute URL in server environment, relative URL in browser
    const url = isServer 
      ? 'http://localhost:3000/api/get-db-url' // Change this to your actual server URL
      : '/api/get-db-url';
    
    console.log(`Fetching database URL from: ${url} (${isServer ? 'server' : 'browser'} environment)`);

    // Diagnostic check for the session API in server environment
    if (isServer) {
      try {
        const sessionCheck = await fetch('http://localhost:3000/api/session', {
          method: 'GET',
          headers,
          credentials: 'include',
        });
        
        console.log(`Session API check: ${sessionCheck.status}`);
        if (sessionCheck.ok) {
          const sessionData = await sessionCheck.json();
          console.log('Session data available:', sessionData !== null && sessionData !== undefined);
        } else {
          console.error(`Session API returned error: ${sessionCheck.status}`);
        }
      } catch (error) {
        console.error('Error checking session API:', error);
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies with the request
    });

    console.log(`Database URL fetch status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response structure:', Object.keys(data).join(', '));
    
    if (data.success && data.url) {
      // Check if URL is not empty
      if (data.url.trim() === '') {
        console.error('Retrieved empty database URL from API');
        return null;
      }
      console.log("Successfully retrieved database URL");
      return data.url;
    } else {
      console.error('Failed to get database URL:', 
        data.error || 'Unknown error',
        'Success:', data.success,
        'URL present:', !!data.url,
        'URL empty:', data.url === '',
        'Full response:', JSON.stringify(data)
      );
      return null;
    }
  } catch (error) {
    console.error('Error fetching database URL:', error);
    return null;
  }
} 