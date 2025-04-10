// /app/(chat)/api/chat/[id]/messages/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/Server';

// POST new message to chat
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const chatId = params.id;
  
  try {
    // Create Supabase client with proper cookie handling
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { role, content } = await request.json();
    
    if (!role || !content || typeof role !== 'string' || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Valid role and content are required' },
        { status: 400 }
      );
    }

    // Verify the chat belongs to the user
    const chatData = await db
      .select()
      .from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, user.id)))
      .limit(1);

    if (!chatData.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Add new message
    const [newMessage] = await db
      .insert(message)
      .values({
        chatId,
        role,
        content
      })
      .returning();

    // If this is the first message and the chat title is "New Chat",
    // update the chat title based on the user's message
    if (role === 'user' && chatData[0].title === 'New Chat') {
      const shortTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      await db
        .update(chat)
        .set({ title: shortTitle })
        .where(eq(chat.id, chatId));
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}
