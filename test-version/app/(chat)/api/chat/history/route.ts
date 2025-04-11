import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
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

// PATCH - Update chat titles in bulk
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const updates = await request.json();
    
    if (!Array.isArray(updates) || !updates.length) {
      return NextResponse.json(
        { error: 'Invalid update format. Expected array of {id, title} objects' },
        { status: 400 }
      );
    }

    // Extract chat IDs to update
    const chatIds = updates.map(update => update.id);
    
    // Verify all chats belong to the user
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(
        and(
          inArray(chat.id, chatIds),
          eq(chat.userId, user.id)
        )
      );
    
    const userChatIds = new Set(userChats.map(c => c.id));
    
    // Process each update individually to ensure ownership
    const results = [];
    for (const { id, title } of updates) {
      // Skip updates for chats that don't belong to user
      if (!userChatIds.has(id)) continue;
      
      if (!title || typeof title !== 'string') continue;
      
      const [updated] = await db
        .update(chat)
        .set({ title })
        .where(eq(chat.id, id))
        .returning();
        
      if (updated) {
        results.push(updated);
      }
    }
    
    return NextResponse.json({
      success: true,
      updated: results.length,
      chats: results
    });
  } catch (error) {
    console.error('Error updating chats:', error);
    return NextResponse.json(
      { error: 'Failed to update chats', details: String(error) },
      { status: 500 }
    );
  }
} 