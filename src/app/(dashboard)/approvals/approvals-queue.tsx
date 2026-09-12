"use client";

import { useState } from "react";
import { Check, X, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/client";
import type { StaffApprovalQueueItem, Profile } from "@/types/database";

type QueueItem = StaffApprovalQueueItem & { profile?: Profile };

export function ApprovalsQueue({ initialQueue }: { initialQueue: QueueItem[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDecision(item: QueueItem, decision: "APPROVED" | "REJECTED") {
    setBusyId(item.id);
    try {
      const supabase = createClient();
      await supabase
        .from("staff_approval_queue")
        .update({ status: decision, reviewed_at: new Date().toISOString() })
        .eq("id", item.id);
      if (item.profile_id) {
        await supabase
          .from("profiles")
          .update({ approval_status: decision === "APPROVED" ? "APPROVED" : "REJECTED" })
          .eq("id", item.profile_id);
      }
      setQueue((prev) => prev.filter((q) => q.id !== item.id));
    } catch {
      // best-effort: senza Supabase configurato l'azione non persiste
    } finally {
      setBusyId(null);
    }
  }

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-slate-500">
          <ClipboardCheck className="h-8 w-8" />
          <p className="text-sm">Nessuna richiesta in attesa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {queue.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center justify-between pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-200">
                {initials(item.profile?.full_name ?? "??")}
              </div>
              <div>
                <p className="font-medium text-slate-100">{item.profile?.full_name ?? "Utente"}</p>
                <p className="text-xs text-slate-500">
                  {item.profile?.email} · Richiede ruolo {ROLE_LABELS[item.requested_role]}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="success"
                disabled={busyId === item.id}
                onClick={() => handleDecision(item, "APPROVED")}
              >
                <Check className="h-4 w-4" /> Approva
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busyId === item.id}
                onClick={() => handleDecision(item, "REJECTED")}
              >
                <X className="h-4 w-4" /> Rifiuta
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
