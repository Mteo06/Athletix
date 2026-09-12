import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotte pubbliche (nessuna sessione richiesta)
const PUBLIC_PATHS = ["/", "/login", "/register", "/setup-organization", "/totem"];

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  // Se Supabase non è ancora configurato, lascia passare tutto: il progetto
  // resta navigabile in preview finché non colleghi le chiavi reali.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Nota: usiamo getSession() (legge il JWT dal cookie, nessuna chiamata di
  // rete) invece di getUser() (che rivaliderebbe il token contro il server
  // Auth di Supabase ad ogni richiesta). La vera barriera di sicurezza sono
  // comunque le policy RLS lato database: questo middleware serve solo a
  // reindirizzare rapidamente l'utente non loggato, quindi non serve pagare
  // il costo di un round-trip di rete extra su ogni navigazione.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
