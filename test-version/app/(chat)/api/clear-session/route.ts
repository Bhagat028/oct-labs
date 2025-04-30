import { getSession } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/Server';

export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers });
    }

    // Extract auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Validate user
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    }
    
    // Get session
    const session = await getSession();
    
    // Check if this session belongs to the authenticated user
    if (session?.userId && session.userId !== data.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers });
    }
    
    // Destroy the entire session to start fresh
    await session.destroy();
    
    return NextResponse.json({ 
      success: true, 
      message: "Session cleared successfully" 
    }, { headers });
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear session", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers }
    );
  }
}
