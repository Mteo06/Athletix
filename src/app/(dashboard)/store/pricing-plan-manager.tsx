"use client";

import { useState } from "react";
import { Plus, Loader2, Package, Power } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/form";
import { formatCents } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { PricingPlan, Discipline } from "@/types/database";

const KIND_LABELS: Record<PricingPlan["kind"], string> = {
  SUBSCRIPTION: "Abbonamento",
  PUNCH_CARD: "Carnet",
  COURSE: "Corso",
  GIFT_CARD: "Gift Card",
  RENTAL: "Noleggio",
  SINGLE_ENTRY: "Ingresso singolo",
};

const PERIOD_LABELS: Record<string, string> = {
  DAYS_1: "1 giorno",
  DAYS_2: "2 giorni",
  DAYS_3: "3 giorni",
  DAYS_4: "4 giorni",
  DAYS_5: "5 giorni",
  DAYS_6: "6 giorni",
  DAYS_7: "7 giorni",
  MONTHLY: "Mensile",
  QUARTERLY: "Trimestrale",
  ANNUAL: "Annuale",
};

const DISCIPLINES: Discipline[] = [
  "SWIMMING",
  "PADEL",
  "SOCCER",
  "TENNIS",
  "BASKETBALL",
  "VOLLEYBALL",
  "FITNESS",
];

const emptyForm = {
  name: "",
  kind: "SUBSCRIPTION" as PricingPlan["kind"],
  period: "MONTHLY",
  days_per_week: "7",
  total_credits: "10",
  price: "",
  discipline: "",
};

export function PricingPlanManager({
  initialPlans,
  orgId,
}: {
  initialPlans: PricingPlan[];
  orgId: string;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function handleCreate() {
    if (!form.name || !form.price) {
      setError("Nome e prezzo sono obbligatori.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const priceCents = Math.round(parseFloat(form.price.replace(",", ".")) * 100);
      const payload: Record<string, unknown> = {
        org_id: orgId,
        name: form.name,
        kind: form.kind,
        price_cents: priceCents,
        active: true,
        discipline: form.discipline || null,
      };
      if (form.kind === "SUBSCRIPTION") {
        payload.period = form.period;
        payload.days_per_week = Number(form.days_per_week);
      }
      if (form.kind === "PUNCH_CARD" || form.kind === "GIFT_CARD") {
        payload.total_credits = Number(form.total_credits);
      }

      const { data, error: insertError } = await supabase
        .from("pricing_plans")
        .insert(payload)
        .select()
        .single();
      if (insertError) throw insertError;
      setPlans((prev) => [data as PricingPlan, ...prev]);
      setOpen(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: PricingPlan) {
    try {
      const supabase = createClient();
      await supabase.from("pricing_plans").update({ active: !plan.active }).eq("id", plan.id);
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: !p.active } : p)));
    } catch {
      // best-effort
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Prodotti in vendita
            </CardTitle>
            <CardDescription>Abbonamenti, carnet, biglietti e gift card configurabili</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo prodotto
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Nessun prodotto configurato. Crea il primo abbonamento, carnet o biglietto.
            </p>
          ) : (
            plans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100">{p.name}</span>
                    <Badge variant="default">{KIND_LABELS[p.kind]}</Badge>
                    {!p.active && <Badge variant="danger">Disattivato</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatCents(p.price_cents)}
                    {p.period && ` · ${PERIOD_LABELS[p.period] ?? p.period}`}
                    {p.days_per_week && p.kind === "SUBSCRIPTION" && ` · ${p.days_per_week}gg/sett`}
                    {p.total_credits && ` · ${p.total_credits} crediti`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>
                  <Power className="h-4 w-4" />
                  {p.active ? "Disattiva" : "Riattiva"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nuovo prodotto"
        description="Crea un abbonamento, carnet, biglietto singolo o gift card da vendere nello Store"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nome prodotto</Label>
            <Input
              placeholder="es. Abbonamento Mensile Full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipologia</Label>
              <Select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as PricingPlan["kind"] })}
              >
                {Object.entries(KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Prezzo (€)</Label>
              <Input
                placeholder="45.00"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>

          {form.kind === "SUBSCRIPTION" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Durata</Label>
                <Select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Giorni a settimana</Label>
                <Select
                  value={form.days_per_week}
                  onChange={(e) => setForm({ ...form, days_per_week: e.target.value })}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 7 ? "(illimitato)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {(form.kind === "PUNCH_CARD" || form.kind === "GIFT_CARD") && (
            <div className="flex flex-col gap-1.5">
              <Label>Numero crediti / ingressi</Label>
              <Input
                type="number"
                min={1}
                value={form.total_credits}
                onChange={(e) => setForm({ ...form, total_credits: e.target.value })}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Disciplina (opzionale)</Label>
            <Select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })}>
              <option value="">Tutte / non specificata</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Crea prodotto
          </Button>
        </div>
      </Dialog>
    </>
  );
}
