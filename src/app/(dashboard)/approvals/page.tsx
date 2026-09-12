import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { StaffApprovalQueueItem, Profile } from "@/types/database";
import { ApprovalsQueue } from "./approvals-queue";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_approval_queue")
    .select("*, profile:profiles(*)")
    .eq("org_id", session.organization.id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });
  const queue = (data as (StaffApprovalQueueItem & { profile?: Profile })[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Approvazioni</h1>
        <p className="text-sm text-slate-400">
          Nuove registrazioni self-service in attesa di conferma da un Amministratore
        </p>
      </div>
      <ApprovalsQueue initialQueue={queue} />
    </div>
  );
}
