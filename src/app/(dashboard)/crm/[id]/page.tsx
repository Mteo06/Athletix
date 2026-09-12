import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/rbac";
import { initials } from "@/lib/utils";
import type { Athlete, AccessTitle, MedicalCertificate, EntryLog } from "@/types/database";
import { AthleteTabs } from "./athlete-tabs";

export const dynamic = "force-dynamic";

export default async function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const [{ data: a }, { data: titles }, { data: certs }, { data: logs }] = await Promise.all([
    supabase.from("athletes").select("*").eq("id", id).eq("org_id", session.organization.id).single(),
    supabase.from("access_titles").select("*").eq("athlete_id", id).order("created_at", { ascending: false }),
    supabase
      .from("medical_certificates")
      .select("*")
      .eq("athlete_id", id)
      .order("expiry_date", { ascending: false }),
    supabase
      .from("entry_logs")
      .select("*")
      .eq("athlete_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const athlete = a as Athlete | null;
  if (!athlete) notFound();

  const accessTitles = (titles as AccessTitle[]) ?? [];
  const certificates = (certs as MedicalCertificate[]) ?? [];
  const entryLogs = (logs as EntryLog[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/crm" className="flex w-fit items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Torna al CRM
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold text-slate-200">
          {initials(athlete.full_name)}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">{athlete.full_name}</h1>
          <p className="text-sm text-slate-400">
            {athlete.email ?? "Nessuna email"} · {athlete.phone ?? "Nessun telefono"}
          </p>
        </div>
      </div>

      <AthleteTabs
        athlete={athlete}
        accessTitles={accessTitles}
        certificates={certificates}
        entryLogs={entryLogs}
        orgId={session.organization.id}
        canUploadDocuments={hasPermission(session.profile.role, "documents:upload")}
      />
    </div>
  );
}
