// /app/(chat)/api/chat/history/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/Server';

export async function GET() {
  try {
    // Create Supabase client with proper cookie handling
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query the database for all chats belonging to the user
    const userChats = await db
      .select()
      .from(chat)
      .where(eq(chat.userId, user.id))
      .orderBy(desc(chat.createdAt));

    return NextResponse.json(userChats);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
