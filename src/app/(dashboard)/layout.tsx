import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.profile.approval_status === "PENDING") {
    redirect("/approvals?pending=self");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={session.profile.role}
        fullName={session.profile.full_name}
        orgName={session.organization?.name ?? "Il tuo impianto"}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
