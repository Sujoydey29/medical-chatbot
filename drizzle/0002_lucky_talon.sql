ALTER TABLE "userPreferences" ADD COLUMN "ageGroup" varchar(32) DEFAULT 'middle-aged';--> statement-breakpoint
ALTER TABLE "userPreferences" ADD COLUMN "responseStyle" varchar(32) DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE "userPreferences" ADD COLUMN "languageComplexity" varchar(32) DEFAULT 'moderate';--> statement-breakpoint
ALTER TABLE "userPreferences" ADD COLUMN "includeMedicalTerms" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "userPreferences" ADD COLUMN "responseLength" varchar(32) DEFAULT 'concise';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profileImage" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dateOfBirth" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;