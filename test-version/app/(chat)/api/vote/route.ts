// /app/(chat)/api/vote/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vote, chat } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// POST add/update vote
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse request body
    const { chatId, messageId, isUpvoted } = await request.json();
    
    if (!chatId || !messageId || typeof isUpvoted !== 'boolean') {
      return NextResponse.json(
        { error: 'Valid chatId, messageId, and isUpvoted are required' },
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

    // Check if vote already exists
    const existingVote = await db
      .select()
      .from(vote)
      .where(
        and(
          eq(vote.chatId, chatId),
          eq(vote.messageId, messageId)
        )
      )
      .limit(1);

    // Update or insert vote
    if (existingVote.length) {
      // Update existing vote
      const [updatedVote] = await db
        .update(vote)
        .set({ isUpvoted })
        .where(
          and(
            eq(vote.chatId, chatId),
            eq(vote.messageId, messageId)
          )
        )
        .returning();
      
      return NextResponse.json(updatedVote);
    } else {
      // Create new vote
      const [newVote] = await db
        .insert(vote)
        .values({
          chatId,
          messageId,
          isUpvoted
        })
        .returning();
      
      return NextResponse.json(newVote);
    }
  } catch (error) {
    console.error('Error adding/updating vote:', error);
    return NextResponse.json(
      { error: 'Failed to add/update vote' },
      { status: 500 }
    );
  }
}

// DELETE remove vote
export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse URL parameters
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    const messageId = url.searchParams.get('messageId');
    
    if (!chatId || !messageId) {
      return NextResponse.json(
        { error: 'Valid chatId and messageId are required' },
        { status: 400 }
      );
    }

    // Delete vote
    await db
      .delete(vote)
      .where(
        and(
          eq(vote.chatId, chatId),
          eq(vote.messageId, messageId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    );
  }
}
