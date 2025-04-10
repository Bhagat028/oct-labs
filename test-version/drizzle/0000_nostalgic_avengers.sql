CREATE TABLE "chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"isUpvoted" boolean NOT NULL,
	CONSTRAINT "vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);
