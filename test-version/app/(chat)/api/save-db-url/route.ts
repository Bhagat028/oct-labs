import { getSession } from '@/lib/session';
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/Server';
import { SessionData } from '@/lib/session'; // Import the SessionData interface

// Define a type that includes the iron-session methods
interface IronSessionWithData extends SessionData {
  save: () => Promise<void>;
  destroy: () => Promise<void>;
}

export async function POST(request: NextRequest) {
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
        console.error("Auth error:", error);
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      
      // Parse request body
      const { url }: { url: string } = await request.json();
      
      // Get session and save URL - with error handling
      try {
        const session = await getSession() as unknown as IronSessionWithData;
        session.databaseUrl = url;
        session.userId = user.id;
        await session.save();
        
        return Response.json({ success: true });
      } catch (sessionError) {
        console.error("Session error:", sessionError);
        return Response.json(
          { success: false, error: "Session storage failed" }, 
          { status: 500 }
        );
      }
    } catch (authError) {
      console.error("Supabase auth error:", authError);
      return Response.json(
        { success: false, error: "Authentication error" }, 
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error saving URL:", error);
    return Response.json(
      { success: false, error: "Failed to save URL" }, 
      { status: 500 }
    );
  }
}
