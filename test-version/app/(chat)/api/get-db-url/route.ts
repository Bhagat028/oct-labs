import { NextRequest, NextResponse } from 'next/server';
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
function decryptUrl(encryptedUrl: string): string {
  // Check if encryption keys are available
  if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
    console.warn("Encryption keys not properly configured. Using base64 decoding instead of decryption.");
    // Fallback to simple decoding if encryption keys aren't available
    return Buffer.from(encryptedUrl, 'base64').toString('utf8');
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
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedUrl, 'base64').toString('utf8');
    } catch (base64Error) {
      throw new Error("Failed to decrypt or decode URL");
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Set CORS headers for API routes
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers });
    }

    console.log("⚡ /api/get-db-url: Processing request...");
    
    // Create Supabase client and get user directly
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error("⚡ /api/get-db-url: No authenticated user");
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401, headers }
      );
    }
    
    const userId = user.id;
    
    // Get encrypted URL from Redis
    const encryptedUrl = await redis.get(`dburl:${userId}`);
    
    // Check if database URL is available
    if (!encryptedUrl) {
      console.error("⚡ /api/get-db-url: No database URL found for user", userId);
      return NextResponse.json(
        { success: false, error: "Database URL not configured" }, 
        { status: 404, headers }
      );
    }
    
    // Decrypt the URL before returning
    try {
      const databaseUrl = decryptUrl(encryptedUrl as string);
      return NextResponse.json(
        { success: true, url: databaseUrl }, 
        { headers }
      );
    } catch (decryptError) {
      console.error("⚡ /api/get-db-url: Error decrypting URL:", decryptError);
      return NextResponse.json(
        { success: false, error: "Error retrieving database URL", details: decryptError instanceof Error ? decryptError.message : String(decryptError) }, 
        { status: 500, headers }
      );
    }
  } catch (error) {
    console.error("⚡ /api/get-db-url: Error retrieving URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve URL", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Create Supabase client and get user directly
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error("⚡ /api/get-db-url: No authenticated user");
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    }
    
    const userId = user.id;
    
    // Check if URL exists before deletion
    const encryptedUrl = await redis.get(`dburl:${userId}`);
    
    if (!encryptedUrl) {
      return Response.json({ 
        success: false, 
        error: "No database URL found to delete" 
      }, { status: 404, headers });
    }
    
    // Delete URL from Redis
    const deleteResult = await redis.del(`dburl:${userId}`);
    
    if (deleteResult !== 1) {
      console.error("⚡ DELETE URL failed: Could not delete entry from Redis");
      return Response.json(
        { success: false, error: "Failed to delete database URL" }, 
        { status: 500, headers }
      );
    }
    
    // Verify deletion worked
    const verifyUrl = await redis.get(`dburl:${userId}`);
    
    if (verifyUrl) {
      console.error("⚡ DELETE URL failed: Redis entry still exists after deletion");
      return Response.json(
        { success: false, error: "Failed to verify database URL deletion" }, 
        { status: 500, headers }
      );
    }
    
    return Response.json({ 
      success: true, 
      message: "Database URL deleted successfully" 
    }, { headers });
   
  } catch (error) {
    console.error("⚡ /api/get-db-url: Error deleting URL:", error);
    return Response.json(
      { success: false, error: "Failed to delete URL", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers }
    );
  }
}
