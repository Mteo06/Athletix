"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossibile accedere. Verifica di aver collegato Supabase (vedi README)."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md fade-slide-up">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400">
            <Activity className="h-5 w-5 text-slate-950" />
          </div>
          <CardTitle className="text-xl">Accedi ad Athletix</CardTitle>
          <CardDescription>Inserisci le credenziali del tuo staff</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nome@impianto.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="mt-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Accedi
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">
            Non hai un impianto registrato?{" "}
            <Link href="/setup-organization" className="text-blue-400 hover:underline">
              Crea il tuo spazio
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
