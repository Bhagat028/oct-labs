import { createClient } from '@/utils/supabase/Server';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
});

// Validate encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

// Function to decrypt the URL with proper error handling
function decryptUrl(encryptedUrl: string): string | null {
  // Check if encryption keys are available
  if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
    console.warn("Encryption keys not properly configured. Using base64 decoding instead of decryption.");
    // Fallback to simple decoding if encryption keys aren't available
    try {
       return Buffer.from(encryptedUrl, 'base64').toString('utf8');
    } catch (err) {
       console.error("Base64 decoding error:", err);
       return null; // Return null on decoding failure
    }
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(ENCRYPTION_IV, 'hex')
    );
    let decrypted = decipher.update(encryptedUrl, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    // Fallback to base64 decoding if decryption fails
     try {
       console.warn("Attempting base64 decoding fallback.");
       return Buffer.from(encryptedUrl, 'base64').toString('utf8');
    } catch (decodeErr) {
       console.error("Base64 decoding error during fallback:", decodeErr);
       return null; // Return null on decoding failure
    }
  }
}

/**
 * Retrieves the user's stored URL from Redis.
 * Requires server-side execution where Supabase cookies are available.
 * @returns The decrypted URL string or null if not found or an error occurs.
 */
export async function getUserStoredUrl(): Promise<string | null> {
  try {
    // Create server-side Supabase client to get the user from cookies
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn("User not authenticated or error fetching user:", error);
      return null; // Return null if user is not authenticated
    }

    // Get the encrypted URL from Redis using the user ID as the key
    const encryptedUrl = await redis.get<string>(`dburl:${user.id}`);

    if (!encryptedUrl) {
      console.log(`No URL found in Redis for user ID: ${user.id}`);
      return null; // Return null if no URL is stored for this user
    }

    // Decrypt the retrieved URL
    const decryptedUrl = decryptUrl(encryptedUrl);

    if (!decryptedUrl) {
        console.error("Failed to decrypt stored URL.");
        return null; // Return null if decryption fails
    }

    console.log(`Successfully retrieved and decrypted URL for user ID: ${user.id}`);
    return decryptedUrl;

  } catch (error) {
    console.error("Error retrieving user URL:", error);
    return null; // Return null on any other error
  }
}
