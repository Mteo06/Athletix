"use client";

import { useState } from "react";
import { LogIn, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ShiftCheckin({ profileId }: { profileId: string | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleCheckin() {
    if (!profileId) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { data: shift } = await supabase
        .from("staff_shifts")
        .select("id")
        .eq("profile_id", profileId)
        .eq("shift_date", today)
        .maybeSingle();
      if (shift) {
        await supabase
          .from("staff_shifts")
          .update({ checked_in_at: new Date().toISOString() })
          .eq("id", shift.id);
      }
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-5">
        <div>
          <p className="text-sm font-medium text-slate-100">Turno di oggi</p>
          <p className="text-xs text-slate-500">Registra il tuo ingresso in struttura</p>
        </div>
        <Button
          onClick={handleCheckin}
          disabled={status === "loading" || status === "done"}
          variant={status === "done" ? "success" : "default"}
          size="sm"
        >
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "done" ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Presente
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Check-in
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
