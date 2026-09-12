"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Building2, User, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

const STEPS = [
  { id: 1, label: "Impianto", icon: Building2 },
  { id: 2, label: "Amministratore", icon: User },
  { id: 3, label: "Conferma", icon: CheckCircle2 },
];

export default function SetupOrganizationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [org, setOrg] = useState({ name: "", address: "", phone: "" });
  const [admin, setAdmin] = useState({ fullName: "", email: "", password: "" });

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1) Crea l'utente Auth (SUPER_ADMIN)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
        options: { data: { full_name: admin.fullName } },
      });
      if (signUpError) throw signUpError;
      const userId = signUpData.user?.id;
      if (!userId) throw new Error("Registrazione non completata: controlla la tua email di conferma.");

      // Se nel progetto Supabase è attiva la "conferma email" (impostazione di
      // default), signUp() crea l'utente ma NON apre una sessione: senza
      // sessione le policy RLS bloccherebbero la creazione dell'organizzazione.
      // In tal caso avvisiamo chiaramente invece di mostrare un errore RLS criptico.
      if (!signUpData.session) {
        throw new Error(
          "Account creato! Controlla la tua email e clicca sul link di conferma, poi torna qui e accedi da /login per completare la creazione dell'impianto. " +
            "(Per i test in locale puoi anche disattivare \"Confirm email\" in Supabase → Authentication → Providers → Email.)"
        );
      }

      // 2) Crea l'organizzazione. Generiamo l'id lato client ed evitiamo
      // .select() dopo l'insert: chiedere a Postgres di "rileggere" la riga
      // appena creata richiederebbe già un permesso SELECT che dipende dal
      // profilo (auth_org_id()) — profilo che a questo punto non esiste
      // ancora. Senza .select(), l'insert basta da solo (RLS INSERT-only).
      const orgId = crypto.randomUUID();
      const { error: orgError } = await supabase.from("organizations").insert({
        id: orgId,
        name: org.name,
        address: org.address,
        phone: org.phone,
        setup_completed: true,
      });
      if (orgError) throw orgError;

      // 3) Crea il profilo SUPER_ADMIN collegato
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        org_id: orgId,
        role: "SUPER_ADMIN",
        approval_status: "APPROVED",
        full_name: admin.fullName,
        email: admin.email,
      });
      if (profileError) throw profileError;

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossibile completare il setup: verifica di aver collegato Supabase (vedi README.md)."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg fade-slide-up">
        <div className="mb-6 flex items-center justify-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400">
            <Activity className="h-4.5 w-4.5 text-slate-950" />
          </div>
          Athletix
        </div>

        <div className="mb-6 flex items-center justify-center gap-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  step >= s.id
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-slate-700 text-slate-500"
                }`}
              >
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-slate-800" />}
            </div>
          ))}
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Parlaci del tuo impianto</CardTitle>
                <CardDescription>Queste informazioni compariranno su ricevute e comunicazioni</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome impianto</Label>
                  <Input
                    placeholder="es. Sporting Club Milano"
                    value={org.name}
                    onChange={(e) => setOrg({ ...org, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Indirizzo</Label>
                  <Input
                    placeholder="Via, città"
                    value={org.address}
                    onChange={(e) => setOrg({ ...org, address: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Telefono</Label>
                  <Input
                    placeholder="+39..."
                    value={org.phone}
                    onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                  />
                </div>
                <Button onClick={() => setStep(2)} disabled={!org.name} className="mt-2">
                  Continua <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Crea l&apos;account Amministratore</CardTitle>
                <CardDescription>Avrai pieno controllo su ruoli, listini e configurazione</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Nome e cognome</Label>
                  <Input
                    value={admin.fullName}
                    onChange={(e) => setAdmin({ ...admin, fullName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={admin.email}
                    onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    minLength={8}
                    value={admin.password}
                    onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Indietro
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!admin.fullName || !admin.email || admin.password.length < 8}
                    className="flex-1"
                  >
                    Continua <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Conferma e crea</CardTitle>
                <CardDescription>Verifica i dati prima di creare il tuo spazio Athletix</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm">
                  <p className="text-slate-400">Impianto</p>
                  <p className="font-medium text-slate-100">{org.name}</p>
                  <p className="mt-3 text-slate-400">Amministratore</p>
                  <p className="font-medium text-slate-100">{admin.fullName} · {admin.email}</p>
                </div>
                {error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>
                    <ArrowLeft className="h-4 w-4" /> Indietro
                  </Button>
                  <Button onClick={handleCreate} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Crea il mio impianto
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
