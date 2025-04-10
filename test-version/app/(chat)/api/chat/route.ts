import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { createClient } from '@/utils/supabase/Server';

export async function POST(req: Request) {
  try {
    // Create Supabase client with proper cookie handling
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    if (!user) {
      console.log("No user found from token");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("User authenticated:", user.id);

    // Parse request body with error handling
    let title = 'New Chat';
    try {
      const body = await req.json();
      title = body?.title || title;
    } catch (error) {
      console.log("Error parsing request body, using default title");
    }
    
    console.log("Creating chat with title:", title);

    // Create a new chat in the database
    const [newChat] = await db
      .insert(chat)
      .values({
        title,
        userId: user.id,
      })
      .returning();

    console.log("New chat created:", newChat);
    return NextResponse.json(newChat);
  } catch (error) {
    console.error('Detailed error creating new chat:', error);
    return NextResponse.json(
      { error: 'Failed to create new chat', details: String(error) },
      { status: 500 }
    );
  }
}
