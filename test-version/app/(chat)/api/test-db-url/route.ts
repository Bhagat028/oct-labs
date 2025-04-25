import { getSession } from '@/lib/session';
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/Server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get the database URL from session
    const session = await getSession();
    const databaseUrl = session.databaseUrl;
    
    // Return masked URL for security
    const maskedUrl = databaseUrl ? maskDatabaseUrl(databaseUrl) : null;
    
    return Response.json({ 
      success: true, 
      hasUrl: !!databaseUrl,
      url: maskedUrl,
      // Only include this in development mode
      ...(process.env.NODE_ENV === 'development' && { 
        rawUrl: databaseUrl
      })
    });
  } catch (error) {
    console.error("Error retrieving database URL:", error);
    return Response.json({ 
      success: false, 
      error: "Failed to retrieve database URL" 
    }, { status: 500 });
  }
}

function maskDatabaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      return url.replace(/:([^:@]+)@/, ":****@");
    }
    return url;
  } catch {
    // Return partially masked string if URL parsing fails
    return url.substring(0, 10) + "..." + url.substring(url.length - 10);
  }
}
