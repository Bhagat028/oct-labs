import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { createClient } from '@/utils/supabase/Server';

// POST - Create a new chat
export async function POST(request: Request) {
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
    const body = await request.json();
    const { title = 'New Chat' } = body;

    // Create a new chat in the database with UUID
    // Note: we don't need to specify id or createdAt as they have defaults
    const [newChat] = await db
      .insert(chat)
      .values({
        title,
        userId: user.id,
        visibility: 'private', // Default visibility
      })
      .returning();

    return NextResponse.json(newChat);
  } catch (error) {
    console.error('Error creating new chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat', details: String(error) },
      { status: 500 }
    );
  }
}
