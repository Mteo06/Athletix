import { createClient } from "@/lib/supabase/server";
import type { Profile, Organization } from "@/types/database";

export interface CurrentSession {
  profile: Profile;
  organization: Organization | null;
}

/**
 * Recupera il profilo dell'utente autenticato + la sua organizzazione in
 * un'unica query (join), con getSession() invece di getUser() per evitare
 * un round-trip di rete extra ad ogni richiesta (vedi middleware.ts per la
 * stessa scelta). Ritorna null se non c'è sessione: le pagine protette dal
 * middleware non dovrebbero mai arrivare qui senza sessione, ma il fallback
 * resta come rete di sicurezza.
 */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", session.user.id)
    .single();
  if (!profile) return null;

  const { organization, ...profileFields } = profile as Profile & { organization: Organization | null };

  return { profile: profileFields as Profile, organization: organization ?? null };
}
