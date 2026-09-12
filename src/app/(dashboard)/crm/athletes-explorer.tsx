"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Loader2, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import { initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Athlete } from "@/types/database";

export function AthletesExplorer({
  initialAthletes,
  orgId,
}: {
  initialAthletes: Athlete[];
  orgId: string | null;
}) {
  const [athletes, setAthletes] = useState(initialAthletes);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", fiscal_code: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.includes(q)
    );
  }, [athletes, query]);

  async function handleCreate() {
    if (!orgId) {
      setError("Nessuna organizzazione collegata: configura Supabase per creare atleti reali.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("athletes")
        .insert({ org_id: orgId, ...form })
        .select()
        .single();
      if (insertError) throw insertError;
      setAthletes((prev) => [data as Athlete, ...prev]);
      setDialogOpen(false);
      setForm({ full_name: "", email: "", phone: "", fiscal_code: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Cerca per nome, email o telefono…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nuovo atleta
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-500">
              <UserRound className="h-8 w-8" />
              <p className="text-sm">Nessun atleta trovato</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Atleta</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Telefono</th>
                  <th className="px-5 py-3 font-medium">Iscritto il</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-900 last:border-0 hover:bg-slate-900/40">
                    <td className="px-5 py-3">
                      <Link href={`/crm/${a.id}`} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                          {initials(a.full_name)}
                        </div>
                        <span className="font-medium text-slate-100 hover:text-blue-300">{a.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{a.email ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-400">{a.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(a.created_at).toLocaleDateString("it-IT")}
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
        title="Nuovo atleta"
        description="Crea una scheda anagrafica: potrai aggiungere abbonamenti e certificati dopo"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nome e cognome</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Telefono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Codice fiscale</Label>
            <Input value={form.fiscal_code} onChange={(e) => setForm({ ...form, fiscal_code: e.target.value })} />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button onClick={handleCreate} disabled={saving || !form.full_name} className="mt-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Crea scheda atleta
          </Button>
        </div>
      </Dialog>
    </>
  );
}
