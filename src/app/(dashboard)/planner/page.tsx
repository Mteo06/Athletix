import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/rbac";
import type { Facility, Space, Booking } from "@/types/database";
import { PlannerGrid } from "./planner-grid";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const orgId = session.organization.id;
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const [{ data: fac }, { data: sp }, { data: bk }] = await Promise.all([
    supabase.from("facilities").select("*").eq("org_id", orgId).order("name"),
    supabase.from("spaces").select("*").eq("org_id", orgId).order("name"),
    supabase
      .from("bookings")
      .select("*")
      .eq("org_id", orgId)
      .gte("starts_at", startOfWeek.toISOString())
      .lt("starts_at", endOfWeek.toISOString()),
  ]);
  const facilities = (fac as Facility[]) ?? [];
  const spaces = (sp as Space[]) ?? [];
  const bookings = (bk as Booking[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Planner Impianti</h1>
        <p className="text-sm text-slate-400">
          Corsie, campi e corsi su griglia settimanale — clicca uno slot libero per prenotarlo
        </p>
      </div>
      <PlannerGrid
        facilities={facilities}
        spaces={spaces}
        bookings={bookings}
        orgId={orgId}
        canConfigure={hasPermission(session.profile.role, "facility:configure")}
      />
    </div>
  );
}
