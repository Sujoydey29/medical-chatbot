import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { nanoid } from "nanoid";
import { users as usersTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyFirebaseToken } from "./firebase-admin";

/**
 * Simple local auth routes (replacement for Manus OAuth)
 * - GET /api/auth/login?userId=...&name=...&redirect=... -> creates session cookie and redirects
 * - GET /api/auth/logout?redirect=... -> clears session cookie and redirects
 */
export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const userIdQuery = req.query.userId as string | undefined;
      const nameQuery = req.query.name as string | undefined;
      const redirect = (req.query.redirect as string) || "/";

      const userId = userIdQuery || `guest_${nanoid(8)}`;
      const name = nameQuery || "Guest";

      // Ensure user exists in DB (simple local sync)
      await db.upsertUser({
        id: userId,
        name: name || null,
        email: null,
        loginMethod: "local",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, redirect);
    } catch (error) {
      console.error("[Auth] Local login failed", error);
      res.status(500).json({ error: "Local login failed" });
    }
  });

  // Register with email and password (POST)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { id, email, password, name } = req.body as { id?: string; email?: string; password?: string; name?: string };
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const userId = id || `user_${nanoid(8)}`;

      const passwordHash = sdk.hashPassword(password);

      await db.upsertUser({
        id: userId,
        name: name ?? null,
        email: email ?? null,
        loginMethod: "local",
        lastSignedIn: new Date(),
        // @ts-ignore - drizzle types allow extra fields
        passwordHash,
      } as any);

      // If a guest session exists (JWT), extract the openId and transfer their data
      try {
        const session = await sdk.verifySession((req.headers.cookie || "").split(";").map(s=>s.trim()).map(s=>s.split("=")[1]).find(Boolean) as string | undefined);
        const guestOpenId = session?.openId;
        if (guestOpenId && guestOpenId.startsWith("guest_")) {
          await db.transferGuestData(guestOpenId, userId);
        }
      } catch (e) {
        console.warn("[Auth] Failed to transfer guest data:", e);
      }

      const sessionToken = await sdk.createSessionToken(userId, { expiresInMs: ONE_YEAR_MS, name });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return res.status(201).json({ id: userId, email });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      return res.status(500).json({ error: "Register failed" });
    }
  });

  // Login with email and password (POST)
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password, redirect } = req.body as { email?: string; password?: string; redirect?: string };
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

  // find user by email using drizzle
  const dbInstance = await db.getDb();
  if (!dbInstance) return res.status(500).json({ error: "Database not available" });

  const found = await dbInstance.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const user = found && found.length > 0 ? found[0] : null;

      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = sdk.verifyPassword(password, user.passwordHash as string | null | undefined);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const sessionToken = await sdk.createSessionToken(user.id, { expiresInMs: ONE_YEAR_MS, name: (user.name as string) || undefined });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      if (redirect) return res.redirect(302, redirect);
      return res.json({ id: user.id, email: user.email });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/logout", (req: Request, res: Response) => {
    const redirect = (req.query.redirect as string) || "/";
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.redirect(302, redirect);
  });

  // Firebase Authentication (POST)
  app.post("/api/auth/firebase", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body as { idToken?: string };
      
      if (!idToken) {
        return res.status(400).json({ error: "Firebase ID token is required" });
      }

      // Verify Firebase token
      const decodedToken = await verifyFirebaseToken(idToken);
      
      if (!decodedToken) {
        return res.status(401).json({ error: "Invalid Firebase token" });
      }

      // Extract user information from Firebase token
      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email || null;
      const name = decodedToken.name || decodedToken.email?.split('@')[0] || "User";
      const profileImage = decodedToken.picture || null;
      const providerId = decodedToken.firebase.sign_in_provider || "firebase";

      // Create user ID using Firebase UID
      const userId = `firebase_${firebaseUid}`;

      // Check if user exists, if not create them
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: "Database not available" });
      }

      const existingUser = await dbInstance
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (!existingUser || existingUser.length === 0) {
        // Create new user
        await db.upsertUser({
          id: userId,
          name: name || null,
          email: email,
          loginMethod: providerId as any,
          lastSignedIn: new Date(),
          // @ts-ignore
          profileImage,
        });
      } else {
        // Update last signed in time
        await db.upsertUser({
          id: userId,
          name: name || null,
          email: email,
          loginMethod: providerId as any,
          lastSignedIn: new Date(),
          // @ts-ignore
          profileImage,
        });
      }

      // Try to transfer guest data if exists
      try {
        const cookieValue = (req.headers.cookie || "")
          .split(";")
          .find(c => c.trim().startsWith(`${COOKIE_NAME}=`))
          ?.split("=")[1];
        
        if (cookieValue) {
          const session = await sdk.verifySession(cookieValue);
          const guestOpenId = session?.openId;
          
          if (guestOpenId && guestOpenId.startsWith("guest_")) {
            await db.transferGuestData(guestOpenId, userId);
          }
        }
      } catch (e) {
        console.warn("[Auth] Failed to transfer guest data:", e);
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(userId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.status(200).json({ 
        success: true,
        user: { 
          id: userId, 
          email, 
          name,
          profileImage 
        } 
      });
    } catch (error) {
      console.error("[Auth] Firebase authentication failed", error);
      return res.status(500).json({ error: "Firebase authentication failed" });
    }
  });
}
