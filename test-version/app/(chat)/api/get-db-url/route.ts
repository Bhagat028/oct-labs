import { getSession } from '@/lib/session';
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/Server';
import { SessionData } from '@/lib/session'; // Make sure to import the interface

export async function GET(request: NextRequest) {
  try {
    // Extract and validate Supabase auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client and validate user
    const supabase = await createClient();
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      
      // Get session and return URL
      try {
        const session = await getSession() as SessionData; // Type assertion here
        
        // Type-safe access to properties
        const userId = session.userId || '';
        const databaseUrl = session.databaseUrl || '';
        
        // Check if this session belongs to the authenticated user
        if (userId && userId !== user.id) {
          return Response.json({ url: "" }); // Return empty if user IDs don't match
        }
        
        return Response.json({ url: databaseUrl });
      } catch (sessionError) {
        console.error("Session error:", sessionError);
        return Response.json({ url: "" });
      }
    } catch (authError) {
      console.error("Supabase auth error:", authError);
      return Response.json(
        { success: false, error: "Authentication error" }, 
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error retrieving URL:", error);
    return Response.json(
      { success: false, error: "Failed to retrieve URL" }, 
      { status: 500 }
    );
  }
}
