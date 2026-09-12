import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { manageableRoles, ROLE_LABELS } from "@/lib/rbac";
import type { UserRole } from "@/types/database";

/**
 * POST /api/invite-staff
 * Body: { email: string, fullName: string, role: UserRole }
 *
 * Flusso reale:
 *  1) Verifica che l'utente corrente possa gestire il ruolo richiesto (RBAC)
 *  2) Crea l'invito Supabase Auth (link magico) con la service_role key
 *  3) Invia una email di benvenuto via Resend con il link di attivazione
 *
 * Richiede in .env.local: SUPABASE_SERVICE_ROLE_KEY e RESEND_API_KEY
 * (vedi .env.example). Senza queste chiavi la route risponde 500 con un
 * messaggio esplicativo, ma il codice è già pronto per l'uso reale.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, fullName, role } = (await request.json()) as {
      email: string;
      fullName: string;
      role: UserRole;
    };

    if (!email || !fullName || !role) {
      return NextResponse.json({ error: "Campi mancanti" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role, org_id, full_name")
      .eq("id", currentUser.id)
      .single();
    if (!currentProfile?.org_id) {
      return NextResponse.json({ error: "Organizzazione non trovata" }, { status: 400 });
    }
    if (!manageableRoles(currentProfile.role as UserRole).includes(role)) {
      return NextResponse.json(
        { error: `Il tuo ruolo (${currentProfile.role}) non può creare account ${role}` },
        { status: 403 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY non configurata. Aggiungila a .env.local per abilitare l'invio email reale (vedi README).",
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // 1) Genera link di invito Supabase (crea l'utente Auth se non esiste)
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${siteUrl}/login`,
    });
    if (inviteError) throw inviteError;

    const invitedUserId = inviteData.user?.id;
    if (invitedUserId) {
      await admin.from("profiles").upsert({
        id: invitedUserId,
        org_id: currentProfile.org_id,
        role,
        approval_status: "APPROVED",
        full_name: fullName,
        email,
      });
    }

    // 2) Invia l'email di benvenuto reale via Resend
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Athletix <onboarding@resend.dev>",
      to: email,
      subject: `${currentProfile.full_name} ti ha invitato su Athletix`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Benvenuto/a in Athletix 👋</h2>
          <p>Sei stato invitato/a come <strong>${ROLE_LABELS[role]}</strong>.</p>
          <p>Controlla la tua casella email per il link di attivazione account inviato da Supabase,
             oppure accedi direttamente qui:</p>
          <p><a href="${siteUrl}/login" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Accedi ad Athletix</a></p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore durante l'invito" },
      { status: 500 }
    );
  }
}
