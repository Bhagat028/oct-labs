// /app/(chat)/api/chat/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET single chat with its messages
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const chatId = params.id;
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get chat details, ensuring it belongs to the user
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

    return NextResponse.json({
      ...chatData[0],
      messages
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat data' },
      { status: 500 }
    );
  }
}

// DELETE chat and its messages
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const chatId = params.id;
  const supabase = createRouteHandlerClient({ cookies });
  
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

    // Delete messages first (to maintain referential integrity)
    await db.delete(message).where(eq(message.chatId, chatId));
    
    // Delete the chat
    await db.delete(chat).where(eq(chat.id, chatId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
