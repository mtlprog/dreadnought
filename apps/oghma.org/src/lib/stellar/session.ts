import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Effect } from "effect";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key"
);
const SESSION_COOKIE_NAME = "oghma_session";
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

export interface SessionData {
  publicKey: string;
  userId?: number;
  createdAt: number;
}

// Create session token
export async function createSession(publicKey: string, userId?: number): Promise<string> {
  const session: SessionData = {
    publicKey,
    userId,
    createdAt: Date.now(),
  };

  const token = await new SignJWT(session as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);

  return token;
}

// Verify and decode session token
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionData;
  } catch {
    return null;
  }
}

// Get session from cookies (server-side)
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

// Set session cookie (server-side)
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

// Clear session cookie (server-side)
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Effect versions
export const getSessionEffect = (): Effect.Effect<SessionData | null, never> =>
  Effect.promise(() => getSession());

export const createSessionEffect = (
  publicKey: string,
  userId?: number
): Effect.Effect<string, never> =>
  Effect.promise(() => createSession(publicKey, userId));

export const setSessionCookieEffect = (token: string): Effect.Effect<void, never> =>
  Effect.promise(() => setSessionCookie(token));

export const clearSessionCookieEffect = (): Effect.Effect<void, never> =>
  Effect.promise(() => clearSessionCookie());
