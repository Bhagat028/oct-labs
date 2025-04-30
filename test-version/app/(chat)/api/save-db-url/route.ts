import { NextRequest } from 'next/server';
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

// Function to encrypt the URL with proper error handling
function encryptUrl(url: string): string {
  // Check if encryption keys are available
  if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
    console.warn("Encryption keys not properly configured. Using base64 encoding instead of encryption.");
    // Fallback to simple encoding if encryption keys aren't available
    return Buffer.from(url).toString('base64');
  }
  
  try {
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      Buffer.from(ENCRYPTION_IV, 'hex')
    );
    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (err) {
    console.error("Encryption error:", err);
    // Fallback to base64 encoding if encryption fails
    return Buffer.from(url).toString('base64');
  }
}

export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    
    // Create Supabase client and get user directly using cookies
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error("Auth error:", error);
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    }
    
    // Parse request body
    const { url }: { url: string } = await request.json();
    
    if (!url || url.trim() === '') {
      return Response.json(
        { success: false, error: "URL is required" }, 
        { status: 400, headers }
      );
    }
    
    try {
      // Log the URL for debugging (remove in production)
      console.log("Processing URL:", url);
      
      // Encrypt the URL before storing
      const encryptedUrl = encryptUrl(url);
      
      // Save encrypted URL to Redis using user ID as key
      await redis.set(`dburl:${user.id}`, encryptedUrl);
      
      // Verify the save worked correctly
      const storedUrl = await redis.get(`dburl:${user.id}`);
      if (storedUrl !== encryptedUrl) {
        console.error("Redis verification failed - URL not saved correctly");
        return Response.json(
          { success: false, error: "Failed to save URL to Redis" }, 
          { status: 500, headers }
        );
      }
      
      return Response.json({ success: true }, { headers });
    } catch (storageError) {
      console.error("Storage error:", storageError);
      return Response.json(
        { success: false, error: "Failed to store URL", details: storageError instanceof Error ? storageError.message : String(storageError) }, 
        { status: 500, headers }
      );
    }
  } catch (error) {
    console.error("Error saving URL:", error);
    return Response.json(
      { success: false, error: "Failed to save URL", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500, headers }
    );
  }
}
