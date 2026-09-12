"use client";

import { useState } from "react";
import { CreditCard, Wallet, Loader2, CheckCircle2, Receipt, ArrowRight, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { formatCents, formatDate, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Athlete, PricingPlan, Order, PaymentMethod } from "@/types/database";

type Step = "plan" | "athlete" | "payment" | "processing" | "done";

/** Calcola la data di fine validità di un abbonamento in base al periodo scelto */
function computeEndsOn(period: string | null, from: Date): string | null {
  const d = new Date(from);
  switch (period) {
    case "DAYS_1": d.setDate(d.getDate() + 1); break;
    case "DAYS_2": d.setDate(d.getDate() + 2); break;
    case "DAYS_3": d.setDate(d.getDate() + 3); break;
    case "DAYS_4": d.setDate(d.getDate() + 4); break;
    case "DAYS_5": d.setDate(d.getDate() + 5); break;
    case "DAYS_6": d.setDate(d.getDate() + 6); break;
    case "DAYS_7": d.setDate(d.getDate() + 7); break;
    case "MONTHLY": d.setMonth(d.getMonth() + 1); break;
    case "QUARTERLY": d.setMonth(d.getMonth() + 3); break;
    case "ANNUAL": d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.toISOString().slice(0, 10);
}

export function SalesFlow({
  athletes,
  plans,
  recentOrders,
  orgId,
  orgName,
  sellerId,
}: {
  athletes: Athlete[];
  plans: PricingPlan[];
  recentOrders: Order[];
  orgId: string | null;
  orgName: string;
  sellerId: string | null;
}) {
  const [step, setStep] = useState<Step>("plan");
  const [athleteId, setAthleteId] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const selectedPlan = plans.find((p) => p.id === planId);
  const selectedAthlete = athletes.find((a) => a.id === athleteId);
  const allowsAnonymous = selectedPlan?.kind === "SINGLE_ENTRY";

  async function completeSale(method: PaymentMethod) {
    if (!orgId || !selectedPlan) {
      setError("Seleziona un prodotto per completare la vendita.");
      return;
    }
    if (!anonymous && !selectedAthlete) {
      setError("Seleziona un atleta oppure attiva la vendita anonima.");
      return;
    }
    setStep("processing");
    setError(null);
    try {
      // Simulazione elaborazione POS (nessun provider reale collegato)
      if (method === "POS") {
        await new Promise((r) => setTimeout(r, 1600));
      }
      const supabase = createClient();
      // eslint-disable-next-line react-hooks/purity -- generato in un event handler, non in render
      const receiptNumber = `RIC-${Date.now().toString().slice(-8)}`;
      const now = new Date();

      // Per abbonamenti/carnet/gift card/biglietti nominali creiamo anche il
      // titolo di accesso, così l'atleta può entrare da Check-in/Totem subito
      // dopo l'acquisto. Le vendite anonime (biglietto singolo senza cliente)
      // non generano un titolo tracciabile: sono ingressi immediati non legati
      // a nessun profilo.
      let accessTitleId: string | null = null;
      if (selectedAthlete && selectedPlan.kind !== "COURSE" && selectedPlan.kind !== "RENTAL") {
        const { data: title, error: titleError } = await supabase
          .from("access_titles")
          .insert({
            org_id: orgId,
            athlete_id: selectedAthlete.id,
            pricing_plan_id: selectedPlan.id,
            kind: selectedPlan.kind,
            status: "VALID",
            starts_on: now.toISOString().slice(0, 10),
            ends_on: selectedPlan.kind === "SUBSCRIPTION" ? computeEndsOn(selectedPlan.period, now) : null,
            days_per_week: selectedPlan.kind === "SUBSCRIPTION" ? selectedPlan.days_per_week : null,
            remaining_credits:
              selectedPlan.kind === "PUNCH_CARD" || selectedPlan.kind === "GIFT_CARD"
                ? selectedPlan.total_credits
                : null,
          })
          .select()
          .single();
        if (titleError) throw titleError;
        accessTitleId = title.id;
      }

      const { data, error: insertError } = await supabase
        .from("orders")
        .insert({
          org_id: orgId,
          athlete_id: selectedAthlete?.id ?? null,
          pricing_plan_id: selectedPlan.id,
          access_title_id: accessTitleId,
          amount_cents: selectedPlan.price_cents,
          payment_method: method,
          sold_by: sellerId,
          receipt_number: receiptNumber,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setLastOrder(data as Order);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la vendita");
      setStep("payment");
    }
  }

  function reset() {
    setStep("plan");
    setAthleteId("");
    setAnonymous(false);
    setPlanId("");
    setError(null);
    setLastOrder(null);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Nuova vendita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex items-center gap-2 text-xs">
            {(["plan", "athlete", "payment", "done"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    step === s || (step === "processing" && s === "payment")
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-slate-700 text-slate-500"
                  )}
                >
                  {i + 1}
                </span>
                {i < 3 && <div className="h-px w-6 bg-slate-800" />}
              </div>
            ))}
          </div>

          {step === "plan" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      planId === p.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-800 hover:border-slate-700"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-100">{p.name}</p>
                    <p className="mt-1 text-lg font-bold text-blue-300">{formatCents(p.price_cents)}</p>
                  </button>
                ))}
                {plans.length === 0 && (
                  <p className="col-span-2 py-6 text-center text-sm text-slate-500">
                    Nessun prodotto attivo. Se hai i permessi, creane uno dal pannello qui sopra.
                  </p>
                )}
              </div>
              <Button onClick={() => setStep("athlete")} disabled={!planId} className="self-end">
                Continua <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "athlete" && (
            <div className="flex flex-col gap-3">
              {allowsAnonymous && (
                <button
                  onClick={() => {
                    setAnonymous(true);
                    setAthleteId("");
                    setStep("payment");
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 py-3 text-sm text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-300"
                >
                  <UserX className="h-4 w-4" /> Vendita anonima (biglietto singolo, senza cliente)
                </button>
              )}
              <Select
                value={athleteId}
                onChange={(e) => {
                  setAnonymous(false);
                  setAthleteId(e.target.value);
                }}
              >
                <option value="">Seleziona un atleta…</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep("plan")}>
                  Indietro
                </Button>
                <Button onClick={() => setStep("payment")} disabled={!athleteId}>
                  Continua <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "payment" && selectedPlan && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
                <p className="text-slate-400">
                  {anonymous ? "Vendita anonima" : selectedAthlete?.full_name} · {selectedPlan.name}
                </p>
                <p className="text-2xl font-bold text-slate-50">{formatCents(selectedPlan.price_cents)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => completeSale("CASSA")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 p-5 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                >
                  <Wallet className="h-6 w-6 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-200">Contanti / Cassa</span>
                </button>
                <button
                  onClick={() => completeSale("POS")}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 p-5 hover:border-blue-500/50 hover:bg-blue-500/5"
                >
                  <CreditCard className="h-6 w-6 text-blue-400" />
                  <span className="text-sm font-medium text-slate-200">POS (simulato)</span>
                </button>
              </div>
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}
              <Button variant="outline" onClick={() => setStep("athlete")} className="self-start">
                Indietro
              </Button>
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Elaborazione pagamento POS in corso (simulazione)…</p>
            </div>
          )}

          {step === "done" && lastOrder && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="font-medium text-slate-100">Vendita completata</p>
              <p className="text-xs text-slate-500">Ricevuta {lastOrder.receipt_number}</p>
              <div className="mt-2 flex gap-2">
                <a
                  href={`/api/receipt?orderId=${lastOrder.id}&receiptNumber=${lastOrder.receipt_number}&athlete=${encodeURIComponent(
                    anonymous ? "Cliente occasionale" : selectedAthlete?.full_name ?? ""
                  )}&item=${encodeURIComponent(selectedPlan?.name ?? "")}&amount=${lastOrder.amount_cents}&method=${lastOrder.payment_method}&org=${encodeURIComponent(orgName)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="secondary">
                    <Receipt className="h-4 w-4" /> Scarica ricevuta PDF
                  </Button>
                </a>
                <Button onClick={reset}>Nuova vendita</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ultime vendite</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recentOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nessuna vendita recente</p>
          ) : (
            recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-200">{o.receipt_number}</p>
                  <p className="text-xs text-slate-500">{formatDate(o.created_at)}</p>
                </div>
                <span className="font-medium text-emerald-300">{formatCents(o.amount_cents)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
