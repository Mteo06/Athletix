import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Athlete } from "@/types/database";
import { AthletesExplorer } from "./athletes-explorer";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("athletes")
    .select("*")
    .eq("org_id", session.organization.id)
    .order("created_at", { ascending: false });
  const athletes = (data as Athlete[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">CRM Atleti</h1>
        <p className="text-sm text-slate-400">
          Anagrafica, abbonamenti, certificati e storico ingressi in un&apos;unica scheda
        </p>
      </div>
      <AthletesExplorer initialAthletes={athletes} orgId={session.organization.id} />
    </div>
  );
}
