CREATE TABLE IF NOT EXISTS "conversations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64),
	"title" text NOT NULL,
	"isGuest" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"conversationId" varchar(64) NOT NULL,
	"role" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"citations" json,
	"searchResults" json,
	"model" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patientMemory" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"entityType" varchar(64) NOT NULL,
	"entityName" text NOT NULL,
	"relationships" json,
	"metadata" json,
	"conversationId" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userPreferences" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"preferredModel" varchar(64) DEFAULT 'sonar-pro',
	"theme" varchar(16) DEFAULT 'light',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"passwordHash" text,
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"lastSignedIn" timestamp DEFAULT now()
);
--> statement-breakpoint
-- Ensure passwordHash exists for older databases
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_userId_idx" ON "conversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversationId_idx" ON "messages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patientMemory_userId_idx" ON "patientMemory" USING btree ("userId");