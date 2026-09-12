"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarRange,
  ShoppingBag,
  ScanLine,
  UserCog,
  ClipboardCheck,
  Activity,
  LogOut,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import { hasPermission, ROLE_LABELS, ROLE_COLORS } from "@/lib/rbac";
import { cn, initials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/crm", label: "CRM Atleti", icon: Users, permission: "crm:view" as const },
  { href: "/planner", label: "Planner", icon: CalendarRange, permission: "planner:view" as const },
  { href: "/store", label: "Store & Vendite", icon: ShoppingBag, permission: "store:sell" as const },
  { href: "/checkin", label: "Check-in", icon: ScanLine, permission: "checkin:operate" as const },
  { href: "/staff-management", label: "Gestione Staff", icon: UserCog, permission: "staff:manage" as const },
  { href: "/approvals", label: "Approvazioni", icon: ClipboardCheck, permission: "staff:approve" as const },
];

export function Sidebar({
  role,
  fullName,
  orgName,
}: {
  role: UserRole;
  fullName: string;
  orgName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase non configurato: ignora e torna comunque alla home
    }
    router.push("/");
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-900 bg-slate-950/60 p-4">
      <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-slate-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400">
          <Activity className="h-4.5 w-4.5 text-slate-950" />
        </div>
        <div className="flex flex-col leading-tight">
          <span>Athletix</span>
          <span className="text-[11px] font-normal text-slate-500">{orgName}</span>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(role, item.permission)).map(
          (item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600/15 text-blue-300"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          }
        )}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl border border-slate-900 bg-slate-900/40 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
          {initials(fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-100">{fullName}</p>
          <span className={cn("mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[10px]", ROLE_COLORS[role])}>
            {ROLE_LABELS[role]}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          title="Esci"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
