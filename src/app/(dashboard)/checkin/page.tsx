"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ScanLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QrScanner, ManualCodeFallback } from "@/components/shared/qr-scanner";
import { cn } from "@/lib/utils";

type Verdict = {
  result: "GREEN" | "RED" | "YELLOW";
  reason: string;
  detail?: string;
  athleteName?: string | null;
};

const VERDICT_STYLE = {
  GREEN: { icon: CheckCircle2, bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-300" },
  RED: { icon: XCircle, bg: "bg-red-500/10 border-red-500/30", text: "text-red-300" },
  YELLOW: { icon: AlertTriangle, bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-300" },
};

export default function CheckinPage() {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Verdict[]>([]);

  async function handleScan(raw: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/verify-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrRaw: raw, gate: "CHECKIN_DESK" }),
      });
      const data: Verdict = await res.json();
      setVerdict(data);
      setHistory((prev) => [data, ...prev].slice(0, 8));
    } catch {
      setVerdict({ result: "RED", reason: "Errore di connessione" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Check-in</h1>
        <p className="text-sm text-slate-400">Scansiona il QR dell&apos;atleta o inserisci il codice manualmente</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <QrScanner active onScan={handleScan} />
            <div className="w-full max-w-sm">
              <ManualCodeFallback onSubmit={handleScan} />
            </div>

            {verdict && (
              <div
                className={cn(
                  "mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl border p-4",
                  VERDICT_STYLE[verdict.result].bg
                )}
              >
                {(() => {
                  const Icon = VERDICT_STYLE[verdict.result].icon;
                  return <Icon className={cn("h-8 w-8 shrink-0", VERDICT_STYLE[verdict.result].text)} />;
                })()}
                <div>
                  <p className={cn("font-semibold", VERDICT_STYLE[verdict.result].text)}>{verdict.reason}</p>
                  {verdict.athleteName && <p className="text-sm text-slate-300">{verdict.athleteName}</p>}
                  {verdict.detail && <p className="text-xs text-slate-400">{verdict.detail}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ultimi ingressi</CardTitle>
            <CardDescription>In questa sessione</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
                <ScanLine className="h-6 w-6" />
                <p className="text-sm">Nessuna scansione ancora</p>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2 text-sm">
                  <span className="text-slate-300">{h.athleteName ?? "—"}</span>
                  <span className={VERDICT_STYLE[h.result].text}>{h.result}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
