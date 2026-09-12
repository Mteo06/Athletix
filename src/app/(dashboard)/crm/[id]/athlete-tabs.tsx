"use client";

import { useEffect, useState } from "react";
import { CreditCard, FileHeart, ScanLine, QrCode as QrIcon, Upload, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/form";
import { cn, formatDate } from "@/lib/utils";
import { renderQrDataUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/client";
import type { Athlete, AccessTitle, MedicalCertificate, EntryLog, EntryResult } from "@/types/database";

const TABS = [
  { id: "titles", label: "Abbonamenti & Carnet", icon: CreditCard },
  { id: "medical", label: "Certificati Medici", icon: FileHeart },
  { id: "entries", label: "Storico Ingressi", icon: ScanLine },
  { id: "qr", label: "QR Accesso", icon: QrIcon },
] as const;

const RESULT_VARIANT: Record<EntryResult, "success" | "danger" | "warning"> = {
  GREEN: "success",
  RED: "danger",
  YELLOW: "warning",
};

export function AthleteTabs({
  athlete,
  accessTitles,
  certificates: initialCertificates,
  entryLogs,
  orgId,
  canUploadDocuments,
}: {
  athlete: Athlete;
  accessTitles: AccessTitle[];
  certificates: MedicalCertificate[];
  entryLogs: EntryLog[];
  orgId: string;
  canUploadDocuments: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("titles");
  const [certificates, setCertificates] = useState(initialCertificates);

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-blue-500 text-blue-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "titles" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {accessTitles.length === 0 ? (
              <EmptyState text="Nessun abbonamento o carnet attivo. Vendine uno dallo Store." />
            ) : (
              accessTitles.map((t) => (
                <Card key={t.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">{t.kind}</span>
                      <Badge variant={t.status === "VALID" ? "success" : "default"}>{t.status}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                      {t.starts_on && <p>Da {formatDate(t.starts_on)} a {t.ends_on ? formatDate(t.ends_on) : "—"}</p>}
                      {t.days_per_week && <p>{t.days_per_week} giorni/settimana</p>}
                      {t.remaining_credits != null && <p>Ingressi residui: {t.remaining_credits}</p>}
                      {t.remaining_balance_cents != null && (
                        <p>Saldo residuo: {(t.remaining_balance_cents / 100).toFixed(2)} €</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "medical" && (
          <MedicalTab
            athlete={athlete}
            orgId={orgId}
            certificates={certificates}
            canUpload={canUploadDocuments}
            onUploaded={(c) => setCertificates((prev) => [c, ...prev])}
          />
        )}

        {tab === "entries" && (
          <div className="flex flex-col gap-2">
            {entryLogs.length === 0 ? (
              <EmptyState text="Nessun ingresso registrato" />
            ) : (
              entryLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-slate-200">{log.reason ?? "Ingresso"}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString("it-IT")} · Varco {log.gate}
                    </p>
                  </div>
                  <Badge variant={RESULT_VARIANT[log.result]}>{log.result}</Badge>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "qr" && <QrPanel athlete={athlete} />}
      </div>
    </div>
  );
}

function MedicalTab({
  athlete,
  orgId,
  certificates,
  canUpload,
  onUploaded,
}: {
  athlete: Athlete;
  orgId: string;
  certificates: MedicalCertificate[];
  canUpload: boolean;
  onUploaded: (c: MedicalCertificate) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function handleUpload() {
    if (!issueDate || !expiryDate) {
      setError("Inserisci data di rilascio e scadenza.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      let documentPath: string | null = null;

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        documentPath = `${orgId}/${athlete.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(documentPath, file, { upsert: false });
        if (uploadError) throw uploadError;
      }

      const { data, error: insertError } = await supabase
        .from("medical_certificates")
        .insert({
          org_id: orgId,
          athlete_id: athlete.id,
          issue_date: issueDate,
          expiry_date: expiryDate,
          document_url: documentPath,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      onUploaded(data as MedicalCertificate);
      setDialogOpen(false);
      setFile(null);
      setIssueDate("");
      setExpiryDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il caricamento");
    } finally {
      setSaving(false);
    }
  }

  async function viewDocument(cert: MedicalCertificate) {
    if (!cert.document_url) return;
    setViewingId(cert.id);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.storage
        .from("documents")
        .createSignedUrl(cert.document_url, 60);
      if (signError) throw signError;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      // best-effort: se il file non è più disponibile, semplicemente non si apre nulla
    } finally {
      setViewingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canUpload && (
        <Button size="sm" className="self-end" onClick={() => setDialogOpen(true)}>
          <Upload className="h-4 w-4" /> Carica certificato
        </Button>
      )}

      {certificates.length === 0 ? (
        <EmptyState text="Nessun certificato caricato" />
      ) : (
        certificates.map((c) => {
          const expired = new Date(c.expiry_date) < new Date();
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
            >
              <div className="text-sm text-slate-300">
                Rilasciato {formatDate(c.issue_date)} · Scadenza {formatDate(c.expiry_date)}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={expired ? "danger" : "success"}>{expired ? "Scaduto" : "Valido"}</Badge>
                {c.document_url && (
                  <Button size="sm" variant="ghost" onClick={() => viewDocument(c)} disabled={viewingId === c.id}>
                    {viewingId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Carica certificato medico"
        description="Il file viene salvato in modo privato: solo lo staff dell'impianto può visualizzarlo"
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data rilascio</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data scadenza</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>File (PDF o immagine, opzionale)</Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button onClick={handleUpload} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salva certificato
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function QrPanel({ athlete }: { athlete: Athlete }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@/lib/qr").then(async ({ generateDynamicToken }) => {
      const token = await generateDynamicToken(athlete.qr_secret);
      const url = await renderQrDataUrl({ type: "DYNAMIC", athleteId: athlete.id, token });
      if (mounted) setDataUrl(url);
    });
    return () => {
      mounted = false;
    };
  }, [athlete]);

  return (
    <Card className="max-w-sm">
      <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="QR di accesso" className="h-56 w-56 rounded-xl border border-slate-800" />
        ) : (
          <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-slate-800 text-xs text-slate-500">
            Generazione QR…
          </div>
        )}
        <p className="text-xs text-slate-500">
          Codice dinamico: si rigenera ogni 60 secondi per impedire screenshot e condivisioni.
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
