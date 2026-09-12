"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Course, CourseEnrollment } from "@/types/database";

export function AttendanceList({
  course,
  enrollments,
}: {
  course: Course;
  enrollments: CourseEnrollment[];
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());

  async function markPresent(athleteId: string) {
    setMarked((prev) => new Set(prev).add(athleteId));
    try {
      const supabase = createClient();
      await supabase.from("course_attendance").insert({
        org_id: course.org_id,
        course_id: course.id,
        athlete_id: athleteId,
        session_date: new Date().toISOString().slice(0, 10),
        present: true,
      });
    } catch {
      // best-effort in demo senza Supabase configurato
    }
  }

  if (enrollments.length === 0) {
    return <p className="text-xs text-slate-500">Nessun iscritto</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {enrollments.map((e) => (
        <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm">
          <span className="text-slate-300">Atleta {e.athlete_id.slice(0, 8)}</span>
          <button
            onClick={() => markPresent(e.athlete_id)}
            disabled={marked.has(e.athlete_id)}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
              marked.has(e.athlete_id)
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-300"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
