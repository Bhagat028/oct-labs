// app/(chat)/api/chat/[id]/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/Server';

// GET single chat with its messages
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Get the chat ID from params
    const params = await context.params;
    const { id: chatId } = params;
    const supabase = await createClient();
      
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      { error: 'Failed to fetch chat data', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE chat and its messages
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = await context.params;
    const { id: chatId } = params;
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Delete messages first (to maintain referential integrity)
    await db.delete(message).where(eq(message.chatId, chatId));
    
    // Delete the chat
    await db.delete(chat).where(eq(chat.id, chatId));

    return NextResponse.json({ 
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat', details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH to update chat details (like title)
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const params = await context.params;
    const { id: chatId } = params;
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { title, visibility } = await request.json();
    
    if (!title && visibility === undefined) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
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

    // Prepare update data
    const updateData: { title?: string; visibility?: string } = {};
    if (title) updateData.title = title;
    if (visibility !== undefined) updateData.visibility = visibility;

    // Update the chat
    const [updatedChat] = await db
      .update(chat)
      .set(updateData)
      .where(eq(chat.id, chatId))
      .returning();

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat', details: String(error) },
      { status: 500 }
    );
  }
}
