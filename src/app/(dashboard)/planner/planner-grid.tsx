"use client";

import { useMemo, useState } from "react";
import { Loader2, Settings2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Facility, Space, Booking, Discipline } from "@/types/database";

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const DISCIPLINES: Discipline[] = [
  "SWIMMING",
  "PADEL",
  "SOCCER",
  "TENNIS",
  "BASKETBALL",
  "VOLLEYBALL",
  "FITNESS",
];

function startOfCurrentWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function PlannerGrid({
  facilities: initialFacilities,
  spaces: initialSpaces,
  bookings,
  orgId,
  canConfigure,
}: {
  facilities: Facility[];
  spaces: Space[];
  bookings: Booking[];
  orgId: string | null;
  canConfigure: boolean;
}) {
  const [facilities, setFacilities] = useState(initialFacilities);
  const [spaces, setSpaces] = useState(initialSpaces);
  const [activeFacility, setActiveFacility] = useState<string | null>(initialFacilities[0]?.id ?? null);
  const [localBookings, setLocalBookings] = useState(bookings);
  const [selected, setSelected] = useState<{ spaceId: string; day: number; hour: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [manageOpen, setManageOpen] = useState(false);

  const weekStart = useMemo(() => startOfCurrentWeek(), []);
  const facilitySpaces = spaces.filter((s) => s.facility_id === activeFacility);

  function findBooking(spaceId: string, day: number, hour: number) {
    const slotStart = new Date(weekStart);
    slotStart.setDate(slotStart.getDate() + day);
    slotStart.setHours(hour, 0, 0, 0);
    return localBookings.find(
      (b) =>
        b.space_ids.includes(spaceId) &&
        new Date(b.starts_at) <= slotStart &&
        new Date(b.ends_at) > slotStart &&
        b.status === "CONFIRMED"
    );
  }

  async function handleConfirmBooking() {
    if (!selected) return;
    if (!orgId) {
      setError("Seleziona uno spazio valido per creare la prenotazione.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const start = new Date(weekStart);
      start.setDate(start.getDate() + selected.day);
      start.setHours(selected.hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + duration);

      const { data, error: insertError } = await supabase
        .from("bookings")
        .insert({
          org_id: orgId,
          space_ids: [selected.spaceId],
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          status: "CONFIRMED",
          price_cents: 0,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setLocalBookings((prev) => [...prev, data as Booking]);
      setSelected(null);
      setDuration(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la prenotazione");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {facilities.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFacility(f.id)}
              className={cn(
                "shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                activeFacility === f.id
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-slate-800 text-slate-400 hover:text-slate-200"
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
        {canConfigure && (
          <Button size="sm" variant="secondary" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4" /> Gestisci impianti
          </Button>
        )}
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-slate-500">
            Nessun impianto configurato ancora.{" "}
            {canConfigure ? (
              <button className="text-blue-400 hover:underline" onClick={() => setManageOpen(true)}>
                Aggiungine uno
              </button>
            ) : (
              "Chiedi a un amministratore di configurarne uno."
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-4">
            <div
              className="grid min-w-[900px] gap-px rounded-xl bg-slate-900 text-xs"
              style={{ gridTemplateColumns: `120px repeat(${DAYS.length}, 1fr)` }}
            >
              <div className="bg-slate-950 p-2" />
              {DAYS.map((d) => (
                <div key={d} className="bg-slate-950 p-2 text-center font-medium text-slate-400">
                  {d}
                </div>
              ))}

              {facilitySpaces.map((space) => (
                <>
                  <div
                    key={`label-${space.id}`}
                    className="bg-slate-950 p-2 font-medium text-slate-300 flex items-center"
                  >
                    {space.name}
                  </div>
                  {DAYS.map((_, dayIdx) => (
                    <div key={`${space.id}-${dayIdx}`} className="bg-slate-950 p-1">
                      <div className="grid grid-cols-3 gap-0.5">
                        {[8, 12, 17].map((hour) => {
                          const booking = findBooking(space.id, dayIdx, hour);
                          return (
                            <button
                              key={hour}
                              onClick={() => !booking && setSelected({ spaceId: space.id, day: dayIdx, hour })}
                              className={cn(
                                "h-8 rounded text-[10px] font-medium transition-colors",
                                booking
                                  ? "bg-blue-600/70 text-white cursor-default"
                                  : "bg-slate-900 text-slate-600 hover:bg-emerald-500/20 hover:text-emerald-300"
                              )}
                              title={`${hour}:00`}
                            >
                              {booking ? "Occ." : `${hour}h`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              ))}
            </div>
            {facilitySpaces.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                Nessuno spazio configurato per questo impianto.{" "}
                {canConfigure && (
                  <button className="text-blue-400 hover:underline" onClick={() => setManageOpen(true)}>
                    Aggiungine uno
                  </button>
                )}
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              Vista semplificata (fasce mattina/pranzo/sera). Clicca uno slot libero per creare una prenotazione.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Nuova prenotazione"
        description={selected ? `${DAYS[selected.day]} alle ${selected.hour}:00` : ""}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Durata (ore)</Label>
            <Input
              type="number"
              min={1}
              max={4}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button onClick={handleConfirmBooking} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Conferma prenotazione
          </Button>
        </div>
      </Dialog>

      {canConfigure && (
        <ManageFacilitiesDialog
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          orgId={orgId}
          facilities={facilities}
          spaces={spaces}
          onFacilityCreated={(f) => {
            setFacilities((prev) => [...prev, f]);
            setActiveFacility((prev) => prev ?? f.id);
          }}
          onSpaceCreated={(s) => setSpaces((prev) => [...prev, s])}
        />
      )}
    </>
  );
}

function ManageFacilitiesDialog({
  open,
  onClose,
  orgId,
  facilities,
  spaces,
  onFacilityCreated,
  onSpaceCreated,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  facilities: Facility[];
  spaces: Space[];
  onFacilityCreated: (f: Facility) => void;
  onSpaceCreated: (s: Space) => void;
}) {
  const [tab, setTab] = useState<"facility" | "space">("facility");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [facilityForm, setFacilityForm] = useState({ name: "", discipline: "SWIMMING" as Discipline });
  const [spaceForm, setSpaceForm] = useState({ name: "", facility_id: facilities[0]?.id ?? "", capacity: "1" });

  async function createFacility() {
    if (!orgId || !facilityForm.name) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("facilities")
        .insert({ org_id: orgId, name: facilityForm.name, discipline: facilityForm.discipline })
        .select()
        .single();
      if (insertError) throw insertError;
      onFacilityCreated(data as Facility);
      setFacilityForm({ name: "", discipline: "SWIMMING" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function createSpace() {
    if (!orgId || !spaceForm.name || !spaceForm.facility_id) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("spaces")
        .insert({
          org_id: orgId,
          facility_id: spaceForm.facility_id,
          name: spaceForm.name,
          capacity: Number(spaceForm.capacity) || 1,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      onSpaceCreated(data as Space);
      setSpaceForm({ name: "", facility_id: spaceForm.facility_id, capacity: "1" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Gestisci impianti e spazi">
      <div className="flex gap-1 border-b border-slate-800 mb-4">
        <button
          onClick={() => setTab("facility")}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium",
            tab === "facility" ? "border-blue-500 text-blue-300" : "border-transparent text-slate-500"
          )}
        >
          Nuovo impianto
        </button>
        <button
          onClick={() => setTab("space")}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium",
            tab === "space" ? "border-blue-500 text-blue-300" : "border-transparent text-slate-500"
          )}
        >
          Nuovo spazio
        </button>
      </div>

      {tab === "facility" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nome impianto</Label>
            <Input
              placeholder="es. Piscina Coperta 25m"
              value={facilityForm.name}
              onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Disciplina</Label>
            <Select
              value={facilityForm.discipline}
              onChange={(e) => setFacilityForm({ ...facilityForm, discipline: e.target.value as Discipline })}
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button onClick={createFacility} disabled={saving || !facilityForm.name}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crea impianto
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Impianto di appartenenza</Label>
            <Select
              value={spaceForm.facility_id}
              onChange={(e) => setSpaceForm({ ...spaceForm, facility_id: e.target.value })}
            >
              <option value="">Seleziona…</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nome spazio</Label>
            <Input
              placeholder="es. Corsia 4, Campo Padel 3…"
              value={spaceForm.name}
              onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Capienza</Label>
            <Input
              type="number"
              min={1}
              value={spaceForm.capacity}
              onChange={(e) => setSpaceForm({ ...spaceForm, capacity: e.target.value })}
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Button onClick={createSpace} disabled={saving || !spaceForm.name || !spaceForm.facility_id}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crea spazio
          </Button>
          {facilities.length === 0 && (
            <p className="text-xs text-amber-300">Crea prima un impianto nella scheda accanto.</p>
          )}
        </div>
      )}

      {spaces.length > 0 && tab === "space" && (
        <p className="mt-3 text-[11px] text-slate-500">
          Spazi esistenti: {spaces.map((s) => s.name).join(", ")}
        </p>
      )}
    </Dialog>
  );
}
