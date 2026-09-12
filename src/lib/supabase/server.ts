import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase per Server Components, Server Actions e Route Handlers.
 * Legge/scrive i cookie di sessione tramite next/headers.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chiamato da un Server Component: ignorabile se hai il middleware
          // che rinfresca le sessioni (vedi src/middleware.ts).
        }
      },
    },
  });
}

/**
 * Client con service_role per operazioni privilegiate lato server
 * (es. inviti staff, bypass RLS controllato). NON esporre mai al client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase Admin non configurato: imposta SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  // Import dinamico per evitare che il client "puro" finisca nel bundle browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient: createRawClient } = require("@supabase/supabase-js");
  return createRawClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
