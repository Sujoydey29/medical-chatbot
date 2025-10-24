/**
 * Script to export a sample conversation as JSON
 * This shows the exact format the backend stores and returns
 * 
 * Usage: 
 * 1. Make sure your app is running
 * 2. Login and create a conversation
 * 3. Run this script with a conversation ID
 */

import * as db from "./server/db";

async function exportConversation(conversationId: string) {
  try {
    // Get conversation
    const conversation = await db.getConversation(conversationId);
    
    if (!conversation) {
      console.error("Conversation not found");
      return;
    }

    // Get messages
    const messages = await db.getConversationMessages(conversationId);

    // Format the response exactly as the backend returns it
    const response = {
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        isGuest: conversation.isGuest,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      messages: messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        citations: msg.citations,
        searchResults: msg.searchResults,
        model: msg.model,
        createdAt: msg.createdAt.toISOString(),
      })),
    };

    // Print JSON
    console.log("\n=== BACKEND JSON RESPONSE ===\n");
    console.log(JSON.stringify(response, null, 2));
    console.log("\n=== END ===\n");

    // Save to file
    const fs = await import("fs/promises");
    await fs.writeFile(
      "conversation-sample.json",
      JSON.stringify(response, null, 2)
    );
    console.log("✅ Saved to conversation-sample.json");

  } catch (error) {
    console.error("Error exporting conversation:", error);
  }
}

// Usage: Replace with your actual conversation ID
const conversationId = process.argv[2];

if (!conversationId) {
  console.log("Usage: tsx export-conversation-sample.ts <conversation-id>");
  console.log("\nTo get a conversation ID:");
  console.log("1. Run the app: pnpm dev");
  console.log("2. Login and chat");
  console.log("3. Go to /database page");
  console.log("4. Copy a conversation ID");
  process.exit(1);
}

exportConversation(conversationId);
