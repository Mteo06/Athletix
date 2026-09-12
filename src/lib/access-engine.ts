import type { AccessTitle, MedicalCertificate } from "@/types/database";

export type EntryVerdict = {
  result: "GREEN" | "RED" | "YELLOW";
  reason: string;
  detail?: string;
};

export interface EntryContext {
  now: Date;
  accessTitle: AccessTitle | null;
  medicalCertificate: MedicalCertificate | null;
  /** Numero di ingressi già usati questa settimana ISO per abbonamenti a giorni/settimana */
  weeklyUsesCount?: number;
  /** Se il titolo è per un corso: finestra lezione [inizio-30min, fine+30min] */
  lessonWindow?: { start: Date; end: Date } | null;
}

const MEDICAL_WARNING_DAYS = 30;

/**
 * verifyProfileEntry — motore di validazione unico usato sia dal Totem che
 * dal Modulo Scansione Segreteria. Logica 1:1 con Athletix_functions.rtf §2.
 *
 * Ordine dei controlli (hard gate prima, poi logica per tipologia titolo):
 *  1) Certificato medico mancante/scaduto -> RED sempre, a prescindere dal titolo
 *  2) Nessun titolo di accesso valido -> RED
 *  3) In base a "kind" del titolo: SUBSCRIPTION / PUNCH_CARD / SINGLE_ENTRY / corso
 *  4) Se tutto ok ma certificato in scadenza entro 30gg -> YELLOW con avviso
 */
export function verifyProfileEntry(ctx: EntryContext): EntryVerdict {
  const { now, accessTitle, medicalCertificate } = ctx;

  // 1) Hard gate certificato medico
  if (!medicalCertificate) {
    return { result: "RED", reason: "Certificato Medico Mancante" };
  }
  const expiry = new Date(medicalCertificate.expiry_date);
  if (expiry < now) {
    return { result: "RED", reason: "Certificato Medico Scaduto" };
  }

  // 2) Nessun titolo
  if (!accessTitle) {
    return { result: "RED", reason: "Nessun Titolo di Accesso Valido" };
  }

  if (accessTitle.status === "SUSPENDED") {
    return { result: "RED", reason: "Titolo Sospeso" };
  }
  if (accessTitle.status === "USED" && accessTitle.kind === "SINGLE_ENTRY") {
    return { result: "RED", reason: "Biglietto Già Utilizzato" };
  }
  if (accessTitle.status === "EXPIRED") {
    return { result: "RED", reason: "Titolo Scaduto" };
  }

  // 3) Logica per tipologia
  switch (accessTitle.kind) {
    case "SUBSCRIPTION": {
      const startsOn = accessTitle.starts_on ? new Date(accessTitle.starts_on) : null;
      const endsOn = accessTitle.ends_on ? new Date(accessTitle.ends_on) : null;
      if ((startsOn && now < startsOn) || (endsOn && now > endsOn)) {
        return { result: "RED", reason: "Abbonamento Fuori Validità" };
      }
      const allowedPerWeek = accessTitle.days_per_week ?? 7;
      const used = ctx.weeklyUsesCount ?? 0;
      if (allowedPerWeek < 7 && used >= allowedPerWeek) {
        return {
          result: "RED",
          reason: "Limite Settimanale Raggiunto",
          detail: `Ingresso ${used}/${allowedPerWeek} della settimana`,
        };
      }
      return maybeYellowForMedicalExpiry(expiry, now, {
        result: "GREEN",
        reason: "Accesso Consentito",
        detail: `Abbonamento - Ingresso ${used + 1}/${allowedPerWeek} della settimana`,
      });
    }

    case "PUNCH_CARD": {
      const remaining = accessTitle.remaining_credits ?? 0;
      if (remaining <= 0) {
        return { result: "RED", reason: "Carnet Esaurito" };
      }
      return maybeYellowForMedicalExpiry(expiry, now, {
        result: "GREEN",
        reason: "Accesso Consentito",
        detail: `Carnet - Scalato ${remaining} → ${remaining - 1}`,
      });
    }

    case "SINGLE_ENTRY": {
      return maybeYellowForMedicalExpiry(expiry, now, {
        result: "GREEN",
        reason: "Accesso Consentito",
        detail: "Ingresso Singolo",
      });
    }

    case "GIFT_CARD": {
      const balance = accessTitle.remaining_balance_cents ?? 0;
      const credits = accessTitle.remaining_credits ?? 0;
      if (balance <= 0 && credits <= 0) {
        return { result: "RED", reason: "Gift Card Esaurita" };
      }
      return maybeYellowForMedicalExpiry(expiry, now, {
        result: "GREEN",
        reason: "Accesso Consentito",
        detail: "Gift Card",
      });
    }

    default:
      return { result: "RED", reason: "Titolo Non Riconosciuto" };
  }
}

/** Validazione dedicata per accesso a corso/lezione con finestra oraria [-30min, +30min] */
export function verifyCourseWindow(ctx: EntryContext): EntryVerdict {
  const base = verifyProfileEntry(ctx);
  if (base.result === "RED") return base;

  if (!ctx.lessonWindow) {
    return { result: "RED", reason: "Nessuna Lezione Programmata Ora" };
  }
  const { start, end } = ctx.lessonWindow;
  if (ctx.now < start || ctx.now > end) {
    return { result: "RED", reason: "Fuori Orario Corso" };
  }
  return base;
}

function maybeYellowForMedicalExpiry(
  expiry: Date,
  now: Date,
  greenVerdict: EntryVerdict
): EntryVerdict {
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  if (daysLeft <= MEDICAL_WARNING_DAYS) {
    return {
      result: "YELLOW",
      reason: "Certificato Medico in Scadenza",
      detail: `${greenVerdict.detail ?? ""} — Scade tra ${daysLeft} giorni`.trim(),
    };
  }
  return greenVerdict;
}
