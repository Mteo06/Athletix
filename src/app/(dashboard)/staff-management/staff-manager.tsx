"use client";

import { useState } from "react";
import { Plus, Loader2, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/form";
import { initials } from "@/lib/utils";
import { manageableRoles, ROLE_LABELS, ROLE_COLORS } from "@/lib/rbac";
import type { Profile, UserRole } from "@/types/database";

export function StaffManager({
  initialStaff,
  currentRole,
}: {
  initialStaff: Profile[];
  currentRole: UserRole;
}) {
  const [staff] = useState(initialStaff);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [form, setForm] = useState<{ fullName: string; email: string; role: UserRole | "" }>({
    fullName: "",
    email: "",
    role: "",
  });

  const assignableRoles = manageableRoles(currentRole);

  async function handleInvite() {
    if (!form.role) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/invite-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, fullName: form.fullName, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Errore durante l'invito");
      setFeedback({ type: "success", text: `Invito inviato a ${form.email}` });
      setForm({ fullName: "", email: "", role: "" });
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Errore" });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} disabled={assignableRoles.length === 0}>
          <Plus className="h-4 w-4" /> Invita collaboratore
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {staff.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">Nessun membro dello staff trovato</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Ruolo</th>
                  <th className="px-5 py-3 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-slate-900 last:border-0 hover:bg-slate-900/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                          {initials(s.full_name)}
                        </div>
                        <span className="font-medium text-slate-100">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{s.email}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${ROLE_COLORS[s.role]}`}>
                        {ROLE_LABELS[s.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={s.approval_status === "APPROVED" ? "success" : "warning"}>
                        {s.approval_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Invita un collaboratore"
        description="Riceverà un'email reale via Resend con il link di attivazione"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nome e cognome</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ruolo</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="">Seleziona un ruolo…</option>
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          {feedback && (
            <p
              className={`rounded-lg border px-3 py-2 text-xs ${
                feedback.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {feedback.text}
            </p>
          )}
          <Button onClick={handleInvite} disabled={sending || !form.fullName || !form.email || !form.role}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Invia invito
          </Button>
        </div>
      </Dialog>
    </>
  );
}
