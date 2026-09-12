"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Activity } from "lucide-react";
import { QrScanner, ManualCodeFallback } from "@/components/shared/qr-scanner";
import { cn } from "@/lib/utils";

type Verdict = {
  result: "GREEN" | "RED" | "YELLOW";
  reason: string;
  detail?: string;
  athleteName?: string | null;
};

const VERDICT_STYLE = {
  GREEN: {
    icon: CheckCircle2,
    ring: "border-emerald-400",
    glow: "shadow-[0_0_120px_rgba(52,211,153,0.35)]",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
  },
  RED: {
    icon: XCircle,
    ring: "border-red-400",
    glow: "shadow-[0_0_120px_rgba(248,113,113,0.35)]",
    text: "text-red-300",
    bg: "bg-red-500/10",
  },
  YELLOW: {
    icon: AlertTriangle,
    ring: "border-amber-400",
    glow: "shadow-[0_0_120px_rgba(251,191,36,0.35)]",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
  },
};

export default function TotemPage() {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleScan(raw: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/verify-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrRaw: raw, gate: "TOTEM" }),
      });
      const data: Verdict = await res.json();
      setVerdict(data);
      setTimeout(() => setVerdict(null), 4000);
    } catch {
      setVerdict({ result: "RED", reason: "Errore di connessione" });
      setTimeout(() => setVerdict(null), 4000);
    } finally {
      setBusy(false);
    }
  }

  const style = verdict ? VERDICT_STYLE[verdict.result] : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-6 py-12 text-center">
      <div className="flex items-center gap-2 text-slate-500">
        <Activity className="h-5 w-5" />
        <span className="text-sm font-medium tracking-wide">ATHLETIX ACCESS POINT</span>
      </div>

      <div
        className={cn(
          "flex h-72 w-72 items-center justify-center rounded-full border-4 transition-all duration-300 pulse-ring",
          style ? `${style.ring} ${style.glow} ${style.bg}` : "border-slate-800"
        )}
      >
        {style ? (
          <style.icon className={cn("h-24 w-24", style.text)} />
        ) : (
          <QrScanner active onScan={handleScan} />
        )}
      </div>

      {verdict ? (
        <div className="flex flex-col gap-1">
          <p className={cn("text-3xl font-bold", style?.text)}>{verdict.reason}</p>
          {verdict.athleteName && <p className="text-lg text-slate-300">{verdict.athleteName}</p>}
          {verdict.detail && <p className="text-sm text-slate-500">{verdict.detail}</p>}
        </div>
      ) : (
        <p className="max-w-sm text-sm text-slate-500">
          Avvicina il tuo QR di accesso alla fotocamera per entrare
        </p>
      )}

      <div className="w-full max-w-xs">
        <ManualCodeFallback onSubmit={handleScan} />
      </div>
    </div>
  );
}
