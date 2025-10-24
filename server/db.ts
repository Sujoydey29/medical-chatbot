import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { 
  InsertUser,
  User,
  users, 
  conversations, 
  messages, 
  patientMemory, 
  userPreferences,
  InsertConversation,
  InsertMessage,
  InsertPatientMemory,
  InsertUserPreferences,
  Conversation,
  Message,
  PatientMemory,
  UserPreferences
} from "../drizzle/schema";
import { nanoid } from 'nanoid';
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    // allow passwordHash to be stored/updated when provided
    if ((user as any).passwordHash !== undefined) {
      const ph = (user as any).passwordHash ?? null;
      values.passwordHash = ph;
      updateSet.passwordHash = ph;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Postgres: perform an upsert by checking existence then insert/update
    const existing = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (existing && existing.length > 0) {
      await db
        .update(users)
        .set({ ...(updateSet as any), id: user.id })
        .where(eq(users.id, user.id));
    } else {
      await db.insert(users).values(values);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Transfer data from a guest user to a registered user.
 * Moves conversations, patient memory and user preferences.
 */
export async function transferGuestData(guestId: string, newUserId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Move conversations (and mark not guest)
    await db
      .update(conversations)
      .set({ userId: newUserId, isGuest: false, updatedAt: new Date() })
      .where(eq(conversations.userId, guestId));

    // Move patient memory
    await db
      .update(patientMemory)
      .set({ userId: newUserId, updatedAt: new Date() })
      .where(eq(patientMemory.userId, guestId));

    // Transfer userPreferences: if newUser already has preferences, remove guest prefs
    const existing = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, newUserId))
      .limit(1);

    if (existing && existing.length > 0) {
      // delete guest's preferences
      await db.delete(userPreferences).where(eq(userPreferences.userId, guestId));
    } else {
      // update guest preferences to new userId
      await db
        .update(userPreferences)
        .set({ userId: newUserId, updatedAt: new Date() })
        .where(eq(userPreferences.userId, guestId));
    }
  } catch (error) {
    console.error("[Database] Failed to transfer guest data:", error);
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Conversation Management
// ============================================

export async function createConversation(
  userId: string | null,
  title: string = "New Conversation",
  isGuest: boolean = false
): Promise<Conversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  const conversation: InsertConversation = {
    id,
    userId,
    title,
    isGuest,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(conversations).values(conversation);
  return conversation as Conversation;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result[0];
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversations.id, id));
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Delete patient memory associated with this conversation
  await db.delete(patientMemory).where(eq(patientMemory.conversationId, id));
  
  // Delete messages
  await db.delete(messages).where(eq(messages.conversationId, id));
  
  // Delete conversation
  await db.delete(conversations).where(eq(conversations.id, id));
}

// ============================================
// Message Management
// ============================================

export async function createMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citations?: string[],
  searchResults?: Array<{ title: string; url: string; snippet: string; date?: string }>,
  model?: string
): Promise<Message> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  const message: InsertMessage = {
    id,
    conversationId,
    role,
    content,
    citations: citations || null,
    searchResults: searchResults || null,
    model: model || null,
    createdAt: new Date(),
  };

  await db.insert(messages).values(message);
  
  // Update conversation timestamp
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return message as Message;
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// ============================================
// Patient Memory Management
// ============================================

export async function createPatientMemory(
  userId: string,
  entityType: string,
  entityName: string,
  relationships?: Array<{ type: string; target: string; metadata?: Record<string, any> }>,
  metadata?: Record<string, any>,
  conversationId?: string
): Promise<PatientMemory> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  const memory: InsertPatientMemory = {
    id,
    userId,
    entityType,
    entityName,
    relationships: relationships || null,
    metadata: metadata || null,
    conversationId: conversationId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(patientMemory).values(memory);
  return memory as PatientMemory;
}

export async function getUserPatientMemory(userId: string): Promise<PatientMemory[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(patientMemory)
    .where(eq(patientMemory.userId, userId))
    .orderBy(desc(patientMemory.updatedAt));
}

export async function updatePatientMemory(
  id: string,
  updates: Partial<InsertPatientMemory>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(patientMemory)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(patientMemory.id, id));
}

export async function deletePatientMemory(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(patientMemory).where(eq(patientMemory.id, id));
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{
    name: string;
    email: string;
    profileImage: string;
    bio: string;
    dateOfBirth: string;
    phone: string;
    address: string;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId));
}

export async function getUserProfile(userId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

// ============================================
// User Preferences
// ============================================

export async function getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  return result[0];
}

export async function upsertUserPreferences(
  userId: string,
  preferences: Partial<InsertUserPreferences>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserPreferences(userId);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId));
  } else {
    const id = nanoid();
    await db.insert(userPreferences).values({
      id,
      userId,
      ...preferences,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InsertUserPreferences);
  }
}
