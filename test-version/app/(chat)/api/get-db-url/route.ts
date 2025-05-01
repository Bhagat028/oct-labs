import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/Server'; // Assumed path for server Supabase client
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// --- Environment Variable Validation & Configuration ---

// Define expected environment variables
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

// Perform validation for critical environment variables at load time
if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error("FATAL ERROR: Required environment variables for Redis (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN) are not configured.");
  // Depending on your strategy, you might add process.exit(1) here.
}

// Validate encryption keys, but allow proceeding (with base64 fallback) if missing
if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
  console.warn("SECURITY WARNING: Encryption keys (ENCRYPTION_KEY, ENCRYPTION_IV) are not fully configured. Falling back to base64 encoding/decoding which is NOT secure for sensitive data.");
} else {
    // Optional: Basic validation for key/iv length expected by AES-256-CBC
    // A 256-bit key is 32 bytes (64 hex chars). An AES IV is 16 bytes (32 hex chars).
    if (ENCRYPTION_KEY.length !== 64 || ENCRYPTION_IV.length !== 32) {
         console.warn("CONFIGURATION WARNING: Encryption key or IV length mismatch for AES-256-CBC. Expected Key: 64 hex chars, IV: 32 hex chars.");
    }
}

// --- External Service Initialization ---

// Initialize Redis client conditionally
let redis: Redis | null = null;
if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
         redis = new Redis({
            url: UPSTASH_REDIS_REST_URL,
            token: UPSTASH_REDIS_REST_TOKEN,
        });
         console.log("Redis client initialization attempted successfully.");
    } catch (redisError) {
        console.error("FATAL ERROR: Failed to initialize Redis client:", redisError);
        redis = null; // Ensure redis is null if initialization fails
    }
} else {
     console.error("FATAL ERROR: Redis client not initialized due to missing environment variables.");
}


// --- Utility Functions ---

// Function to encrypt the URL with proper error handling and fallback
function encryptUrl(url: string): string {
   // Prefer AES encryption if keys are configured and appear valid
  if (ENCRYPTION_KEY && ENCRYPTION_IV && ENCRYPTION_KEY.length === 64 && ENCRYPTION_IV.length === 32) {
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
      console.error("AES encryption failed:", err);
      // Fall through to base64 fallback if AES encryption fails
    }
  } else {
      console.warn("Encryption keys are missing or invalid. Attempting base64 encoding instead of AES encryption.");
  }

  // Fallback to base64 encoding
  try {
     return Buffer.from(url).toString('base64');
  } catch (base64Error) {
    console.error("Base64 encoding fallback failed:", base64Error);
    throw new Error("Failed to encode URL using base64 fallback");
  }
}

// Function to decrypt the URL with proper error handling and fallback
function decryptUrl(encryptedUrl: string): string {
  // Prefer AES decryption if keys are configured and appear valid
  if (ENCRYPTION_KEY && ENCRYPTION_IV && ENCRYPTION_KEY.length === 64 && ENCRYPTION_IV.length === 32) {
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
      console.error("AES decryption failed:", err);
      // Fall through to base64 fallback if AES decryption fails
    }
  } else {
      console.warn("Encryption keys are missing or invalid. Attempting base64 decoding instead of AES decryption.");
  }

  // Fallback to base64 decoding
  try {
    return Buffer.from(encryptedUrl, 'base64').toString('utf8');
  } catch (base64Error) {
    console.error("Base64 decoding fallback failed:", base64Error);
    throw new Error("Failed to decrypt or decode URL after multiple attempts");
  }
}


// Helper for standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Consider restricting this in production
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', // Added POST
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
function handleOptions() {
   return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Helper to check if Redis is available before attempting operations
function isRedisAvailable(redisClient: Redis | null): redisClient is Redis {
    return redisClient !== null;
}

// --- API Route Handlers ---

export async function GET(request: NextRequest) {
  // Handle OPTIONS request first
  if (request.method === 'OPTIONS') {
     return handleOptions();
  }

  console.log("⚡ /api/get-db-url: Processing GET request...");

  // Ensure Redis client is available before proceeding
  if (!isRedisAvailable(redis)) {
      console.error("⚡ /api/get-db-url: Redis client is not initialized or available. Cannot retrieve URL.");
      return NextResponse.json(
         { success: false, error: "Server configuration error: Redis not available" },
         { status: 500, headers: corsHeaders }
      );
  }

  try {
    // Create Supabase client and get user directly from the request context (uses cookies)
    const supabase = await createClient(); // Assumes createClient uses cookies from request
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn("⚡ /api/get-db-url: No authenticated user found for GET request. Returning Unauthorized.");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = user.id;
    console.log(`⚡ /api/get-db-url: Authenticated user ID: ${userId}`);

    // Get encrypted URL from Redis
    const encryptedUrl: string | null = await redis.get(`dburl:${userId}`);

    // Check if database URL is available for the user
    if (!encryptedUrl) {
      console.warn(`⚡ /api/get-db-url: No database URL found in Redis for user ${userId}. Returning Not Found.`);
      return NextResponse.json(
        { success: false, error: "Database URL not configured for this user" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Decrypt the URL before returning
    try {
      const databaseUrl = decryptUrl(encryptedUrl);
      console.log(`⚡ /api/get-db-url: Successfully retrieved and decrypted URL for user ${userId}`);
      return NextResponse.json(
        { success: true, url: databaseUrl },
        { headers: corsHeaders }
      );
    } catch (decryptError) {
      console.error(`⚡ /api/get-db-url: Error decrypting URL for user ${userId}:`, decryptError);
      return NextResponse.json(
        { success: false, error: "Error processing database URL", details: decryptError instanceof Error ? decryptError.message : String(decryptError) },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("⚡ /api/get-db-url: Unhandled error in GET request processing:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected server error occurred", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function POST(request: NextRequest) {
  // Handle OPTIONS request first
  if (request.method === 'OPTIONS') {
     return handleOptions();
  }

  console.log("⚡ /api/get-db-url: Processing POST request...");

  // Ensure Redis client is available before proceeding
   if (!isRedisAvailable(redis)) {
      console.error("⚡ /api/get-db-url: Redis client is not initialized or available. Cannot save URL.");
      return NextResponse.json(
         { success: false, error: "Server configuration error: Redis not available" },
         { status: 500, headers: corsHeaders }
      );
  }

  try {
    // Create Supabase client and get user directly using cookies
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn("⚡ /api/get-db-url: No authenticated user found for POST request. Returning Unauthorized.");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const userId = user.id;
    console.log(`⚡ /api/get-db-url: Authenticated user ID for POST: ${userId}`);

    // Parse request body
    const body = await request.json();
    const url: string | undefined = body?.url; // Use optional chaining and explicit type

    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.warn(`⚡ /api/get-db-url: Invalid or missing URL in POST body for user ${userId}`);
      return NextResponse.json(
        { success: false, error: "Valid URL string is required in the request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Log the URL for debugging (consider removing or redacting in production)
    console.log(`⚡ /api/get-db-url: Received URL for user ${userId}: https://help.merge.dev/en/articles/5389715-understanding-redacted-values-in-logs`); // Log carefully

    try {
      // Encrypt the URL before storing
      const encryptedUrl = encryptUrl(url);
      console.log(`⚡ /api/get-db-url: Encrypted URL for user ${userId}`);

      // Save encrypted URL to Redis using user ID as key
      // Consider adding an expiration time (TTL) if URLs shouldn't persist indefinitely
      // await redis.set(`dburl:${user.id}`, encryptedUrl, { ex: 60 * 60 * 24 * 7 }); // Example: 1 week expiry
      await redis.set(`dburl:${user.id}`, encryptedUrl);
      console.log(`⚡ /api/get-db-url: Saved encrypted URL to Redis for user ${userId}`);

      // Optional: Verify the save worked correctly by reading it back
      // This adds robustness but also latency and another Redis call.
      // In most cases, redis.set is atomic and reliable, so this might be redundant.
      // const storedUrl = await redis.get(`dburl:${user.id}`);
      // if (storedUrl !== encryptedUrl) {
      //   console.error(`⚡ /api/get-db-url: Redis verification failed - URL not saved correctly for user ${userId}`);
      //   return NextResponse.json(
      //     { success: false, error: "Failed to verify URL save to Redis" },
      //     { status: 500, headers: corsHeaders }
      //   );
      // }
      // console.log(`⚡ /api/get-db-url: Redis save verified for user ${userId}`);


      return NextResponse.json({ success: true, message: "Database URL saved successfully" }, { headers: corsHeaders });
    } catch (storageError) {
      console.error(`⚡ /api/get-db-url: Storage or Encryption error for user ${userId}:`, storageError);
      return NextResponse.json(
        { success: false, error: "Failed to process and store URL", details: storageError instanceof Error ? storageError.message : String(storageError) },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("⚡ /api/get-db-url: Unhandled error in POST request processing:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected server error occurred", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}


export async function DELETE(request: NextRequest) {
  // Handle OPTIONS request first
   if (request.method === 'OPTIONS') {
      return handleOptions();
   }

  console.log("⚡ /api/get-db-url: Processing DELETE request...");

  // Ensure Redis client is available before proceeding
   if (!isRedisAvailable(redis)) {
      console.error("⚡ /api/get-db-url: Redis client is not initialized or available. Cannot delete URL.");
      return NextResponse.json(
         { success: false, error: "Server configuration error: Redis not available" },
         { status: 500, headers: corsHeaders }
      );
  }

  try {
    // Create Supabase client and get user directly from the request context
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn("⚡ /api/get-db-url: No authenticated user found for DELETE request. Returning Unauthorized.");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const userId = user.id;
    console.log(`⚡ /api/get-db-url: Authenticated user ID for DELETE: ${userId}`);

    // Check if URL exists before deletion (optional but good practice)
    const exists = await redis.exists(`dburl:${userId}`);

    if (!exists) {
      console.warn(`⚡ /api/get-db-url: No database URL found in Redis to delete for user ${userId}. Returning Not Found.`);
      // Use 404 if the resource to be deleted doesn't exist.
      return NextResponse.json({
        success: false,
        error: "No database URL found to delete for this user"
      }, { status: 404, headers: corsHeaders });
    }

    // Delete URL from Redis
    const deleteResult = await redis.del(`dburl:${userId}`);

    // redis.del returns the number of keys that were removed. Expected is 1 if it existed.
    if (deleteResult !== 1) {
      console.error(`⚡ /api/get-db-url: Redis DEL command failed unexpectedly for user ${userId}. Expected 1, got ${deleteResult}.`);
       return NextResponse.json(
        { success: false, error: "Failed to delete database URL from Redis" },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`⚡ /api/get-db-url: Database URL successfully deleted from Redis for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Database URL deleted successfully"
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("⚡ /api/get-db-url: Unhandled error in DELETE request processing:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected server error occurred", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Note: OPTIONS handler is implicitly handled by Next.js if you have handlers
// for the methods listed in the Access-Control-Allow-Methods header.
// But having the explicit handleOptions function and calling it first is
// a clear way to manage the preflight response manually.