import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema';
import { nanoid } from 'nanoid';
import { createClient } from '@/utils/supabase/Server';

// It's fine here if createClient() needs request-specific context like cookies/session
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json();
    const { title = 'New Chat' } = body;

    // Insert new chat
    const [newChat] = await db
      .insert(chat)
      .values({
        title,
        userId: user.id,
        visibility: 'private',
      })
      .returning();

    if (!newChat) {
      return NextResponse.json(
        { error: 'Failed to create chat' },
        { status: 500 }
      );
    }

    return NextResponse.json(newChat);

  } catch (error) {
    console.error('Error creating new chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
