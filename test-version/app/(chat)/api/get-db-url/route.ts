import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/Server';

// Default database URL to use if not found in session

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

    console.log("⚡ /api/get-db-url: Getting session...");
    
    // Get session first
    const session = await getSession();
    
    // Log session information for diagnosis
    console.log("⚡ /api/get-db-url: Session retrieved:", {
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : 'none',
      hasDatabaseUrl: session && 'databaseUrl' in session,
      databaseUrlLength: session && session.databaseUrl ? session.databaseUrl.length : 0
    });

    // Extract auth token if present
    const authHeader = request.headers.get('authorization');
    
    // If no auth header, just return the database URL from the session if available
    if (!authHeader?.startsWith('Bearer ')) {
      if (!session || !session.databaseUrl || session.databaseUrl.trim() === '') {
        console.error("⚡ /api/get-db-url: No database URL in session, checking environment variables");
        
        // Try to get from environment variables as a last resort
        const envDbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        
        if (envDbUrl) {
          console.log("⚡ /api/get-db-url: Found database URL in environment variables");
          return NextResponse.json({ success: true, url: envDbUrl }, { headers });
        }
        
        console.error("⚡ /api/get-db-url: No database URL found in session or environment");
        return NextResponse.json(
          { success: false, error: "No database URL found", sessionAvailable: !!session }, 
          { status: 404, headers }
        );
      }
      
      console.log("⚡ /api/get-db-url: Returning database URL from session");
      return NextResponse.json({ success: true, url: session.databaseUrl }, { headers });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client and validate user
    const supabase = await createClient();
    
    // Verify the token and get user data
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401, headers }
      );
    }
    
    const user = data.user;
    
    // Type-safe access to properties
    const userId = session?.userId || '';
    const databaseUrl = session?.databaseUrl || '';
    
    // Check if this session belongs to the authenticated user
    if (userId && userId !== user.id) {
      return NextResponse.json(
        { success: false, url: "" }, 
        { headers }
      );
    }
    
    // Check if database URL is available
    if (!databaseUrl || databaseUrl.trim() === '') {
      console.error("⚡ /api/get-db-url: No database URL available for authenticated user");
      return NextResponse.json(
        { success: false, error: "Database URL not configured" }, 
        { status: 404, headers }
      );
    }
    
    return NextResponse.json(
      { success: true, url: databaseUrl }, 
      { headers }
    );
  } catch (error) {
    console.error("⚡ /api/get-db-url: Error retrieving URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve URL", details: error instanceof Error ? error.message : String(error) }, 
      { status: 500 }
    );
  }
}
