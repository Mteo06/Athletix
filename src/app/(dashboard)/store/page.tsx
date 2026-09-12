import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/rbac";
import type { Athlete, PricingPlan, Order } from "@/types/database";
import { SalesFlow } from "./sales-flow";
import { PricingPlanManager } from "./pricing-plan-manager";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const orgId = session.organization.id;
  const canManagePricing = hasPermission(session.profile.role, "pricing:edit");

  const [{ data: a }, { data: p }, { data: o }] = await Promise.all([
    supabase.from("athletes").select("*").eq("org_id", orgId).order("full_name"),
    supabase
      .from("pricing_plans")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const athletes = (a as Athlete[]) ?? [];
  const allPlans = (p as PricingPlan[]) ?? [];
  const activePlans = allPlans.filter((plan) => plan.active);
  const recentOrders = (o as Order[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Store & Vendite</h1>
        <p className="text-sm text-slate-400">
          Vendi abbonamenti, carnet e noleggi. Incasso in cassa o simulazione POS, ricevuta PDF automatica.
        </p>
      </div>

      {canManagePricing && <PricingPlanManager initialPlans={allPlans} orgId={orgId} />}

      <SalesFlow
        athletes={athletes}
        plans={activePlans}
        recentOrders={recentOrders}
        orgId={orgId}
        orgName={session.organization.name}
        sellerId={session.profile.id}
      />
    </div>
  );
}
