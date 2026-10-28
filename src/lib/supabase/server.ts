import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-only: uses the service_role key, which bypasses RLS entirely.
// Never import this from a client component.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Server-only: reads the caller's session from cookies (set by the
// @supabase/ssr browser client), for Route Handlers and Server Components
// that need to know which user is making the request. The `setAll` write is
// wrapped in try/catch because a Server Component render can't write
// cookies — that failure is safe to ignore there, and never happens in a
// Route Handler (where the write really does need to succeed).
export function createAuthClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Session refresh cookies can't be written from a Server
            // Component render; safe to ignore here.
          }
        },
      },
    }
  );
}
