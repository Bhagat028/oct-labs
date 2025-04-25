import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  databaseUrl?: string;
  userId?: string; // Store Supabase user ID to link sessions
}

// In your lib/session.ts file:
export const sessionOptions = {
    password: process.env.SESSION_PASSWORD as string,
    cookieName: 'db-connection-data-store', // Change from 'db-connection-session'
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      path: '/',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60, // Add expiration
    }
  };
  

export async function getSession() {
    try {
      const cookieStore = cookies();
      return getIronSession<SessionData>(cookieStore, sessionOptions);
    } catch (error) {
      console.error("Session error:", error);
      // Return fallback empty session
      return { /* empty session object */ };
    }
  }
  