import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyProfileEntry } from "@/lib/access-engine";
import { decodeQrPayload, verifyDynamicToken } from "@/lib/qr";
import type { AccessTitle, MedicalCertificate } from "@/types/database";

/**
 * POST /api/verify-entry
 * Body: { qrRaw: string, gate?: string }
 * Usato sia dal Totem self-service che dal modulo Check-in di Segreteria.
 */
export async function POST(request: NextRequest) {
  try {
    const { qrRaw, gate = "MAIN" } = await request.json();
    const payload = decodeQrPayload(qrRaw);
    if (!payload) {
      return NextResponse.json({ result: "RED", reason: "QR Non Valido" }, { status: 200 });
    }

    const supabase = await createClient();

    let athleteId: string | null = null;
    if (payload.type === "DYNAMIC") {
      athleteId = payload.athleteId;
      const { data: athlete } = await supabase
        .from("athletes")
        .select("qr_secret")
        .eq("id", athleteId)
        .single();
      if (!athlete || !(await verifyDynamicToken(payload.token, athlete.qr_secret))) {
        return NextResponse.json({ result: "RED", reason: "Codice Scaduto o Non Valido" });
      }
    } else {
      const { data: title } = await supabase
        .from("access_titles")
        .select("athlete_id")
        .eq("qr_code", payload.code)
        .single();
      athleteId = title?.athlete_id ?? null;
    }

    if (!athleteId) {
      return NextResponse.json({ result: "RED", reason: "Atleta Non Trovato" });
    }

    const [{ data: accessTitle }, { data: certificate }] = await Promise.all([
      supabase
        .from("access_titles")
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("status", "VALID")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("medical_certificates")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("expiry_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const verdict = verifyProfileEntry({
      now: new Date(),
      accessTitle: (accessTitle as AccessTitle) ?? null,
      medicalCertificate: (certificate as MedicalCertificate) ?? null,
    });

    // Log dell'ingresso (best-effort: se org_id non risolvibile, salta il log)
    const { data: athleteRow } = await supabase
      .from("athletes")
      .select("org_id, full_name")
      .eq("id", athleteId)
      .single();

    if (athleteRow) {
      await supabase.from("entry_logs").insert({
        org_id: athleteRow.org_id,
        athlete_id: athleteId,
        access_title_id: accessTitle?.id ?? null,
        gate,
        result: verdict.result,
        reason: verdict.reason,
      });
    }

    return NextResponse.json({ ...verdict, athleteName: athleteRow?.full_name ?? null });
  } catch (err) {
    return NextResponse.json(
      { result: "RED", reason: "Errore di sistema", detail: err instanceof Error ? err.message : String(err) },
      { status: 200 }
    );
  }
}
