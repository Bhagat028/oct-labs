import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/Server';

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

    // Get session first
    const session = await getSession();
    
    // Extract auth token if present
    const authHeader = request.headers.get('authorization');
    
    // If no auth header, just return the database URL from the session if available
    if (!authHeader?.startsWith('Bearer ')) {
      const databaseUrl = session.databaseUrl || '';
      return NextResponse.json({ success: true, url: databaseUrl }, { headers });
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
    const userId = session.userId || '';
    const databaseUrl = session.databaseUrl || '';
    
    // Check if this session belongs to the authenticated user
    if (userId && userId !== user.id) {
      return NextResponse.json(
        { success: false, url: "" }, 
        { headers }
      );
    }
    
    return NextResponse.json(
      { success: true, url: databaseUrl }, 
      { headers }
    );
  } catch (error) {
    console.error("Error retrieving URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve URL" }, 
      { status: 500 }
    );
  }
}
