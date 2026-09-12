// Tipi di dominio allineati a supabase/schema.sql
// (In produzione puoi generarli automaticamente con:
//  npx supabase gen types typescript --project-id <id> > src/types/database.ts )

export type UserRole =
  | "SUPER_ADMIN"
  | "DIRETTORE"
  | "COORDINATORE"
  | "SEGRETERIA"
  | "ISTRUTTORE";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Discipline =
  | "SWIMMING"
  | "PADEL"
  | "SOCCER"
  | "TENNIS"
  | "BASKETBALL"
  | "VOLLEYBALL"
  | "FITNESS";

export type SubscriptionPeriod =
  | "DAYS_1" | "DAYS_2" | "DAYS_3" | "DAYS_4" | "DAYS_5" | "DAYS_6" | "DAYS_7"
  | "MONTHLY" | "QUARTERLY" | "ANNUAL";

export type AccessTitleStatus = "VALID" | "USED" | "EXPIRED" | "SUSPENDED";
export type EntryResult = "GREEN" | "RED" | "YELLOW";
export type PaymentMethod = "CASSA" | "POS" | "ONLINE";
export type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  setup_completed: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Athlete {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  fiscal_code: string | null;
  birth_date: string | null;
  photo_url: string | null;
  emergency_contact: string | null;
  notes: string | null;
  qr_secret: string;
  created_at: string;
}

export interface MedicalCertificate {
  id: string;
  org_id: string;
  athlete_id: string;
  issue_date: string;
  expiry_date: string;
  document_url: string | null;
}

export interface Facility {
  id: string;
  org_id: string;
  name: string;
  discipline: Discipline;
}

export interface Space {
  id: string;
  org_id: string;
  facility_id: string;
  name: string;
  capacity: number;
}

export interface PricingPlan {
  id: string;
  org_id: string;
  name: string;
  kind: "SUBSCRIPTION" | "PUNCH_CARD" | "COURSE" | "GIFT_CARD" | "RENTAL" | "SINGLE_ENTRY";
  period: SubscriptionPeriod | null;
  days_per_week: number | null;
  total_credits: number | null;
  price_cents: number;
  discipline: Discipline | null;
  active: boolean;
}

export interface AccessTitle {
  id: string;
  org_id: string;
  athlete_id: string;
  pricing_plan_id: string | null;
  kind: "SUBSCRIPTION" | "PUNCH_CARD" | "SINGLE_ENTRY" | "GIFT_CARD";
  status: AccessTitleStatus;
  starts_on: string | null;
  ends_on: string | null;
  days_per_week: number | null;
  remaining_credits: number | null;
  remaining_balance_cents: number | null;
  qr_code: string;
}

export interface Course {
  id: string;
  org_id: string;
  name: string;
  discipline: Discipline;
  instructor_id: string | null;
  space_id: string | null;
  level: string | null;
  capacity: number;
}

export interface CourseShift {
  id: string;
  course_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface CourseEnrollment {
  id: string;
  org_id: string;
  course_id: string;
  athlete_id: string;
  access_title_id: string | null;
}

export interface Booking {
  id: string;
  org_id: string;
  athlete_id: string | null;
  space_ids: string[];
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  price_cents: number;
  recurring_rule: string | null;
}

export interface Order {
  id: string;
  org_id: string;
  athlete_id: string;
  pricing_plan_id: string | null;
  access_title_id: string | null;
  booking_id: string | null;
  amount_cents: number;
  payment_method: PaymentMethod;
  sold_by: string | null;
  receipt_number: string;
  created_at: string;
}

export interface EntryLog {
  id: string;
  org_id: string;
  athlete_id: string | null;
  access_title_id: string | null;
  gate: string;
  result: EntryResult;
  reason: string | null;
  created_at: string;
}

export interface StaffApprovalQueueItem {
  id: string;
  org_id: string;
  profile_id: string;
  requested_role: UserRole;
  status: ApprovalStatus;
  created_at: string;
}

/** Placeholder minimo per il client tipizzato @supabase/supabase-js<Database> */
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
  };
}
