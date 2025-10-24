import { pgTable, text, timestamp, varchar, boolean, json, index } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  // Password hash for local authentication (nullable for OAuth/guest users)
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 32 }).default("user").notNull(),
  // Profile fields
  profileImage: text("profileImage"), // URL to profile image
  bio: text("bio"), // User bio/about
  dateOfBirth: text("dateOfBirth"), // Store as string for flexibility
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Conversations table - stores chat sessions
 */
export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }), // nullable for guest sessions
  title: text("title").notNull(),
  isGuest: boolean("isGuest").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("conversations_userId_idx").on(table.userId),
}));

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual chat messages
 */
export const messages = pgTable("messages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  conversationId: varchar("conversationId", { length: 64 }).notNull(),
  role: varchar("role", { length: 32 }).notNull(),
  content: text("content").notNull(),
  citations: json("citations").$type<string[]>(), // Array of citation URLs
  searchResults: json("searchResults").$type<Array<{
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>>(),
  model: varchar("model", { length: 64 }), // Which Perplexity model was used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("conversationId_idx").on(table.conversationId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Patient memory table - stores knowledge graph for logged-in users
 * This implements Phase 2 patient memory feature
 */
export const patientMemory = pgTable("patientMemory", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(), // 'person', 'condition', 'medication', 'symptom', etc.
  entityName: text("entityName").notNull(),
  relationships: json("relationships").$type<Array<{
    type: string; // 'has_condition', 'takes_medication', 'related_to', etc.
    target: string; // Related entity name
    metadata?: Record<string, any>;
  }>>(),
  metadata: json("metadata").$type<Record<string, any>>(), // Additional context
  conversationId: varchar("conversationId", { length: 64 }), // Where this was learned
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("patientMemory_userId_idx").on(table.userId),
}));

export type PatientMemory = typeof patientMemory.$inferSelect;
export type InsertPatientMemory = typeof patientMemory.$inferInsert;

/**
 * User preferences table - stores model selection and other settings
 */
export const userPreferences = pgTable("userPreferences", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull().unique(),
  preferredModel: varchar("preferredModel", { length: 64 }).default("sonar-pro"),
  theme: varchar("theme", { length: 16 }).default("light"),
  // Bot personality settings
  ageGroup: varchar("ageGroup", { length: 32 }).default("middle-aged"), // 'young', 'middle-aged', 'old'
  responseStyle: varchar("responseStyle", { length: 32 }).default("professional"), // 'simple', 'professional', 'detailed'
  languageComplexity: varchar("languageComplexity", { length: 32 }).default("moderate"), // 'simple', 'moderate', 'technical'
  includeMedicalTerms: boolean("includeMedicalTerms").default(true),
  responseLength: varchar("responseLength", { length: 32 }).default("concise"), // 'brief', 'concise', 'comprehensive'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;
