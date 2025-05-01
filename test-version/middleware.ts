import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware' // Make sure this path is correct

export async function middleware(request: NextRequest) {
  // This will now run for all matched paths, including your /api/ routes
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - specific file extensions (svg, png, etc.)
     *
     * IMPORTANT: Removed the |api/| exclusion. API routes will now pass through middleware.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}