import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Euro,
  ScanLine,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDate } from "@/lib/utils";
import type { MedicalCertificate, Athlete } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const orgId = session.organization.id;
  // eslint-disable-next-line react-hooks/purity -- Server Component: calcolo dati richiesta, non stato di render
  const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [{ count: athleteCount }, { count: entriesToday }, { data: orders }, { data: certs }] =
    await Promise.all([
      supabase.from("athletes").select("*", { count: "exact", head: true }).eq("org_id", orgId),
      supabase
        .from("entry_logs")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from("orders")
        .select("amount_cents")
        .eq("org_id", orgId)
        .gte("created_at", new Date(new Date().setDate(1)).toISOString()),
      supabase
        .from("medical_certificates")
        .select("*, athlete:athletes(*)")
        .eq("org_id", orgId)
        .lte("expiry_date", in30Days)
        .order("expiry_date", { ascending: true })
        .limit(6),
    ]);

  const monthRevenue = (orders ?? []).reduce((sum, o) => sum + (o.amount_cents ?? 0), 0);
  const expiringCerts = (certs as (MedicalCertificate & { athlete?: Athlete })[]) ?? [];

  const kpis = [
    { label: "Atleti attivi", value: String(athleteCount ?? 0), icon: Users, tone: "text-blue-400" },
    { label: "Incasso mese", value: formatCents(monthRevenue), icon: Euro, tone: "text-emerald-400" },
    { label: "Ingressi oggi", value: String(entriesToday ?? 0), icon: ScanLine, tone: "text-cyan-400" },
    {
      label: "Certificati in scadenza",
      value: String(expiringCerts.length),
      icon: AlertTriangle,
      tone: "text-amber-400",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
          <p className="text-sm text-slate-400">Panoramica in tempo reale del tuo impianto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.tone}`} />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-50">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Certificati medici in scadenza</CardTitle>
              <CardDescription>Prossimi 30 giorni</CardDescription>
            </div>
            <Link href="/crm" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
              Vai al CRM <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {expiringCerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Nessun certificato in scadenza nei prossimi 30 giorni.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {expiringCerts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5"
                  >
                    <span className="text-sm text-slate-200">{c.athlete?.full_name ?? "Atleta"}</span>
                    <Badge variant="warning">Scade il {formatDate(c.expiry_date)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Azioni rapide</CardTitle>
            <CardDescription>Le operazioni più frequenti</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <QuickLink href="/store" icon={Euro} label="Registra una vendita" />
            <QuickLink href="/checkin" icon={ScanLine} label="Apri Check-in / Totem" />
            <QuickLink href="/crm" icon={Users} label="Nuova scheda atleta" />
            <QuickLink href="/planner" icon={CalendarClock} label="Vai al Planner" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-300"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
