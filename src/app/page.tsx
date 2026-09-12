import Link from "next/link";
import {
  Activity,
  QrCode,
  Users,
  CalendarRange,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "RBAC a 5 livelli",
    desc: "Admin Generale, Direttore, Coordinatore, Segreteria e Istruttore: ogni ruolo vede solo ciò che gli serve.",
  },
  {
    icon: QrCode,
    title: "Accessi QR anti-frode",
    desc: "QR dinamico rigenerato ogni 60 secondi, verifica certificato medico e titolo in tempo reale al totem.",
  },
  {
    icon: Users,
    title: "CRM 360°",
    desc: "Anagrafica atleti, abbonamenti, carnet, certificati e storico ingressi in un'unica scheda cliente.",
  },
  {
    icon: CalendarRange,
    title: "Planner multi-impianto",
    desc: "Corsie, campi padel, calcio e corsi su griglia settimanale con gestione conflitti automatica.",
  },
  {
    icon: ShoppingBag,
    title: "Store & Ricevute",
    desc: "Vendita abbonamenti, carnet e noleggi con incasso in cassa/POS e ricevuta PDF generata al volo.",
  },
  {
    icon: Activity,
    title: "Staff & Approvazioni",
    desc: "Onboarding self-service dello staff con coda di approvazione e gestione turni dedicata.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400">
            <Activity className="h-4.5 w-4.5 text-slate-950" />
          </div>
          Athletix
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Accedi</Button>
          </Link>
          <Link href="/setup-organization">
            <Button size="sm">Crea il tuo impianto</Button>
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-16 pt-10 text-center fade-slide-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Nuova release · multi-tenant, moderna, pronta per Supabase
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-50 sm:text-6xl">
          Gestisci il tuo impianto sportivo,{" "}
          <span className="text-gradient">senza fogli Excel</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg text-slate-400">
          Athletix unifica CRM, planner spazi, controllo accessi QR, staff e vendite in
          un&apos;unica piattaforma pensata per piscine, centri padel, calcio e corsi sportivi.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/setup-organization">
            <Button size="lg">
              Inizia gratis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/totem">
            <Button size="lg" variant="outline">
              Prova il Totem Accessi
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Card key={f.title} className="fade-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="pt-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        Athletix — piattaforma dimostrativa collegabile a Supabase. © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
