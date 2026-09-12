"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase per componenti "use client".
 * Richiede NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 * (vedi .env.example). Finché queste variabili non sono impostate con le chiavi
 * reali del tuo progetto Supabase, ogni chiamata a questo client fallirà:
 * questo è atteso, il codice è pronto per essere collegato al tuo backend.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return createBrowserClient(url, anonKey);
}
