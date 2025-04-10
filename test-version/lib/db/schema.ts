// lib/db/schema.ts

import {
    pgTable,
    uuid,
    text,
    timestamp,
    varchar,
    boolean,
    primaryKey,
  } from 'drizzle-orm/pg-core';
  
  // Chat table: Stores individual chat sessions.
  // Since Supabase manages your user authentication (usually via the "auth.users" table),
  // the userId here is a reference to your Supabase user ID.
  export const chat = pgTable('chat', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    // A title can be generated from the first message or provided by the user.
    title: text('title').notNull(),
    // Store the user's Supabase id. (There is no foreign key constraint here because
    // the Supabase auth table might be managed separately.)
    userId: uuid('userId').notNull(),
    // Optional field: public or private chat visibility.
    visibility: text('visibility').notNull().default('private'),
  });
  
  // Message table: Stores messages for each chat.
  export const message = pgTable('message', {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    // Reference the chat session. You may enforce this via application logic,
    // as Supabase Auth manages users separately.
    chatId: uuid('chatId').notNull(),
    // Role indicates who sent the message, e.g. "user" or "assistant".
    role: varchar('role', { length: 20 }).notNull(),
    // The plain text content of the message.
    content: text('content').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  });
  
  // Optional: Vote table for up/down votes on messages.
  // You can remove this if you're not using vote functionality.
  export const vote = pgTable(
    'vote',
    {
      chatId: uuid('chatId').notNull(),
      messageId: uuid('messageId').notNull(),
      isUpvoted: boolean('isUpvoted').notNull(),
    },
    (table) => ({
      pk: primaryKey(table.chatId, table.messageId),
    })
  );
  