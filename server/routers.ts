import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  callPerplexity,
  buildSessionContext,
  buildPatientMemoryPrompt,
  extractPatientEntities,
  AVAILABLE_MODELS,
} from "./perplexity";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================
  // Conversation Management
  // ============================================
  conversations: router({
    // Create new conversation
    create: publicProcedure
      .input(z.object({
        title: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id || null;
        const isGuest = !ctx.user;
        const title = input.title || "New Conversation";
        
        return await db.createConversation(userId, title, isGuest);
      }),

    // Get user's conversations
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserConversations(ctx.user.id);
      }),

    // Get single conversation with messages
    get: publicProcedure
      .input(z.object({
        id: z.string(),
      }))
      .query(async ({ input }) => {
        const conversation = await db.getConversation(input.id);
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        const messages = await db.getConversationMessages(input.id);
        
        return {
          conversation,
          messages,
        };
      }),

    // Update conversation title
    updateTitle: publicProcedure
      .input(z.object({
        id: z.string(),
        title: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateConversationTitle(input.id, input.title);
        return { success: true };
      }),

    // Delete conversation
    delete: publicProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteConversation(input.id);
        return { success: true };
      }),
  }),

  // ============================================
  // Chat API
  // ============================================
  chat: router({
    // Send message and get AI response
    send: publicProcedure
      .input(z.object({
        conversationId: z.string(),
        message: z.string(),
        model: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { conversationId, message, model = "sonar-pro" } = input;

        // Verify conversation exists
        const conversation = await db.getConversation(conversationId);
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        // Save user message
        await db.createMessage(conversationId, "user", message);

        // Get conversation history for session memory
        const history = await db.getConversationMessages(conversationId);
        const sessionContext = buildSessionContext(
          history.map(m => ({ role: m.role, content: m.content }))
        );

        // Get user context (profile and preferences) if logged in
        let userContext;
        if (ctx.user) {
          const profile = await db.getUserProfile(ctx.user.id);
          const preferences = await db.getUserPreferences(ctx.user.id);
          
          userContext = {
            profile: profile ? {
              name: profile.name || undefined,
              bio: profile.bio || undefined,
              dateOfBirth: profile.dateOfBirth || undefined,
              address: profile.address || undefined,
            } : undefined,
            preferences: preferences ? {
              ageGroup: preferences.ageGroup || undefined,
              responseStyle: preferences.responseStyle || undefined,
              languageComplexity: preferences.languageComplexity || undefined,
              includeMedicalTerms: preferences.includeMedicalTerms ?? undefined,
              responseLength: preferences.responseLength || undefined,
            } : undefined,
          };
        }

        // Get patient memory if user is logged in (Phase 2)
        let patientMemoryPrompt = "";
        if (ctx.user) {
          const patientMemory = await db.getUserPatientMemory(ctx.user.id);
          patientMemoryPrompt = buildPatientMemoryPrompt(patientMemory);
        }

        // Build messages for Perplexity API
        // Avoid sending consecutive messages with the same role (Perplexity requires alternation).
        const messages = sessionContext.slice();
        const newUserMessage = { role: "user" as const, content: message + patientMemoryPrompt };
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        if (lastMsg && lastMsg.role === "user") {
          // merge with last user message
          lastMsg.content = `${lastMsg.content}\n${newUserMessage.content}`;
        } else {
          messages.push(newUserMessage);
        }

        // Call Perplexity API with user context
        const response = await callPerplexity(messages, model, userContext, message);

        // Save assistant response
        const assistantMessage = await db.createMessage(
          conversationId,
          "assistant",
          response.content,
          response.citations,
          response.searchResults,
          response.model
        );

        // Extract and save patient memory if user is logged in (Phase 2)
        if (ctx.user) {
          try {
            const conversationText = `User: ${message}\nAssistant: ${response.content}`;
            const entities = await extractPatientEntities(conversationText);
            
            // Save extracted entities to patient memory
            for (const entity of entities) {
              await db.createPatientMemory(
                ctx.user.id,
                entity.entityType,
                entity.entityName,
                entity.relationships || undefined,
                entity.metadata || undefined,
                conversationId
              );
            }
          } catch (error) {
            console.error("[Chat] Failed to extract patient memory:", error);
            // Don't fail the request if memory extraction fails
          }
        }

        return {
          message: assistantMessage,
          citations: response.citations,
          searchResults: response.searchResults,
        };
      }),

    // Get available models
    models: publicProcedure
      .query(() => {
        return AVAILABLE_MODELS;
      }),
  }),

  // ============================================
  // Patient Memory Management (Phase 2)
  // ============================================
  memory: router({
    // Get user's patient memory
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserPatientMemory(ctx.user.id);
      }),

    // Delete specific memory
    delete: protectedProcedure
      .input(z.object({
        id: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.deletePatientMemory(input.id);
        return { success: true };
      }),

    // Clear all patient memory
    clearAll: protectedProcedure
      .mutation(async ({ ctx }) => {
        const memories = await db.getUserPatientMemory(ctx.user.id);
        for (const memory of memories) {
          await db.deletePatientMemory(memory.id);
        }
        return { success: true };
      }),
  }),

  // ============================================
  // User Profile Management
  // ============================================
  profile: router({
    // Get user profile
    get: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUserProfile(ctx.user.id);
      }),

    // Update user profile
    update: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        profileImage: z.string().optional(),
        bio: z.string().optional(),
        dateOfBirth: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============================================
  // User Preferences
  // ============================================
  preferences: router({
    // Get user preferences
    get: protectedProcedure
      .query(async ({ ctx }) => {
        const prefs = await db.getUserPreferences(ctx.user.id);
        return prefs || {
          preferredModel: "sonar-pro",
          theme: "light",
          ageGroup: "middle-aged",
          responseStyle: "professional",
          languageComplexity: "moderate",
          includeMedicalTerms: true,
          responseLength: "concise",
        };
      }),

    // Update user preferences
    update: protectedProcedure
      .input(z.object({
        preferredModel: z.string().optional(),
        theme: z.enum(["light", "dark", "system"]).optional(),
        ageGroup: z.enum(["young", "middle-aged", "old"]).optional(),
        responseStyle: z.enum(["simple", "professional", "detailed"]).optional(),
        languageComplexity: z.enum(["simple", "moderate", "technical"]).optional(),
        includeMedicalTerms: z.boolean().optional(),
        responseLength: z.enum(["brief", "concise", "comprehensive"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
