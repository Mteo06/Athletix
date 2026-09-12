import { redirect } from "next/navigation";
import { CalendarClock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseEnrollment } from "@/types/database";
import { ShiftCheckin } from "./shift-checkin";
import { AttendanceList } from "./attendance-list";

export const dynamic = "force-dynamic";

export default async function StaffMobilePage() {
  const session = await getCurrentSession();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, enrollments:course_enrollments(*)")
    .eq("org_id", session.organization.id)
    .eq("instructor_id", session.profile.id);
  const courses = (data as (Course & { enrollments?: CourseEnrollment[] })[]) ?? [];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-4 py-8">
      <div>
        <p className="text-xs text-slate-500">Ciao,</p>
        <h1 className="text-xl font-semibold text-slate-50">{session.profile.full_name}</h1>
      </div>

      <ShiftCheckin profileId={session.profile.id} />

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <CalendarClock className="h-4 w-4" /> I miei corsi
        </h2>
        <div className="flex flex-col gap-3">
          {courses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                Nessun corso assegnato
              </CardContent>
            </Card>
          ) : (
            courses.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">{c.name}</CardTitle>
                  <Badge variant="info">
                    <Users className="mr-1 h-3 w-3" /> {c.enrollments?.length ?? 0}/{c.capacity}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <AttendanceList course={c} enrollments={c.enrollments ?? []} />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
