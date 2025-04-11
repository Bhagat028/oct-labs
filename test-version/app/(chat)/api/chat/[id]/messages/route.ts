// /app/(chat)/api/chat/[id]/messages/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/Server';
// POST: Add a new message to a chat
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: chatId } = params;
  const supabase = await createClient();
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    // Update chat title if this is the first user message and title is "New Chat"
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

// GET: Retrieve all messages for a chat
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: chatId } = params;
  const supabase = await createClient();
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify the chat belongs to the user
    const chatData = await db
      .select()
      .from(chat)
      .where(and(eq(chat.id, chatId), eq(chat.userId, user.id)))
      .limit(1);

    if (!chatData.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Get messages for this chat
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(message.createdAt);

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
