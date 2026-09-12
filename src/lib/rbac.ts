import type { UserRole } from "@/types/database";

/**
 * Matrice permessi di Athletix — rispecchia fedelmente la gerarchia descritta
 * nella specifica: SUPER_ADMIN > DIRETTORE > COORDINATORE > SEGRETERIA > ISTRUTTORE.
 */
export type Permission =
  | "org:setup"
  | "org:settings"
  | "staff:manage" // creare/gestire account
  | "staff:approve" // approvare la coda registrazioni
  | "pricing:edit" // prezzi/listini
  | "facility:configure" // orari, corsie, campi
  | "crm:view"
  | "crm:edit"
  | "planner:view"
  | "planner:edit"
  | "courses:manage" // turni, griglia corsi
  | "courses:enroll" // iscrivere atleti / spostarli
  | "rentals:flexible" // noleggio con selezione puntuale corsie
  | "store:sell"
  | "checkin:operate"
  | "finance:view"
  | "documents:upload"
  | "own-courses:view"
  | "own-shift:checkin"
  | "attendance:mark";

const MATRIX: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    "org:setup",
    "org:settings",
    "staff:manage",
    "staff:approve",
    "pricing:edit",
    "facility:configure",
    "crm:view",
    "crm:edit",
    "planner:view",
    "planner:edit",
    "courses:manage",
    "courses:enroll",
    "rentals:flexible",
    "store:sell",
    "checkin:operate",
    "finance:view",
    "documents:upload",
  ],
  DIRETTORE: [
    "staff:manage",
    "staff:approve",
    "pricing:edit",
    "facility:configure",
    "crm:view",
    "crm:edit",
    "planner:view",
    "planner:edit",
    "courses:manage",
    "courses:enroll",
    "rentals:flexible",
    "store:sell",
    "checkin:operate",
    "finance:view",
    "documents:upload",
  ],
  COORDINATORE: [
    "crm:view",
    "planner:view",
    "planner:edit",
    "courses:manage",
    "courses:enroll",
    "rentals:flexible",
    "documents:upload",
  ],
  SEGRETERIA: [
    "crm:view",
    "crm:edit",
    "store:sell",
    "checkin:operate",
    "staff:approve", // solo approvazioni + totem, non gestione account
    "planner:view",
    "documents:upload",
  ],
  ISTRUTTORE: ["own-courses:view", "own-shift:checkin", "attendance:mark"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Ruoli che un dato ruolo può creare/gestire nello staff management */
export function manageableRoles(role: UserRole): UserRole[] {
  switch (role) {
    case "SUPER_ADMIN":
      return ["DIRETTORE", "COORDINATORE", "SEGRETERIA", "ISTRUTTORE"];
    case "DIRETTORE":
      return ["SEGRETERIA", "ISTRUTTORE"];
    default:
      return [];
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Admin Generale",
  DIRETTORE: "Direttore",
  COORDINATORE: "Coordinatore",
  SEGRETERIA: "Segreteria",
  ISTRUTTORE: "Istruttore / Bagnino",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  DIRETTORE: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  COORDINATORE: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  SEGRETERIA: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  ISTRUTTORE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};
