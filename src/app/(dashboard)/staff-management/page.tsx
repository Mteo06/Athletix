import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffManagementPage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", session.organization.id)
    .order("full_name");
  const staff = (data as Profile[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Gestione Staff</h1>
        <p className="text-sm text-slate-400">Crea account, assegna ruoli e invita nuovi collaboratori via email</p>
      </div>
      <StaffManager initialStaff={staff} currentRole={session.profile.role} />
    </div>
  );
}
