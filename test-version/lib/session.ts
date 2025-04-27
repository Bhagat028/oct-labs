import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  databaseUrl?: string;
  userId?: string; // Store Supabase user ID to link sessions
}

// Extended interface with session methods
export type IronSessionWithData = IronSession<SessionData>;

// In your lib/session.ts file:
export const sessionOptions = {
  password: (process.env.SESSION_PASSWORD && process.env.SESSION_PASSWORD.length >= 32) 
      ? process.env.SESSION_PASSWORD 
      : 'THIS_IS_A_DEVELOPMENT_PASSWORD_MAKE_IT_LONGER_NOW_32CHARS',
  cookieName: 'db-connection-data-store',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60,
  }
};

  

export async function getSession(): Promise<IronSessionWithData> {
    try {
      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      return session;
    } catch (error) {
      console.error("Session error:", error);
      // Return fallback empty session with mock save and destroy methods
      return { 
        databaseUrl: undefined,
        userId: undefined,
        save: async () => { console.warn("Mock session save called"); },
        destroy: async () => { console.warn("Mock session destroy called"); }
      } as unknown as IronSessionWithData;
    }
  }
  