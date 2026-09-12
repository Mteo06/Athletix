-- =====================================================================================
-- ATHLETIX — SCHEMA SUPABASE (PostgreSQL) + ROW LEVEL SECURITY + SEED DEMO
-- =====================================================================================
-- Come usarlo:
--   1) Crea un progetto su https://supabase.com
--   2) Vai su SQL Editor -> New query -> incolla questo intero file -> Run
--   3) Copia Project URL + anon key + service_role key nel file .env.local
--      (vedi .env.example nella root del progetto)
--   4) Il seed in fondo crea un'organizzazione demo "Athletix Sport Center"
--      con un utente SUPER_ADMIN: usa Supabase Auth per creare l'utente con
--      la stessa email (demo@athletix.app) e collegalo al profilo (vedi nota SEED).
-- =====================================================================================

-- ---------------------------------------------------------------------------
-- 0. ESTENSIONI
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------------
create type user_role as enum (
  'SUPER_ADMIN',
  'DIRETTORE',
  'COORDINATORE',
  'SEGRETERIA',
  'ISTRUTTORE'
);

create type approval_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create type discipline as enum (
  'SWIMMING', 'PADEL', 'SOCCER', 'TENNIS', 'BASKETBALL', 'VOLLEYBALL', 'FITNESS'
);

create type subscription_period as enum (
  'DAYS_1', 'DAYS_2', 'DAYS_3', 'DAYS_4', 'DAYS_5', 'DAYS_6', 'DAYS_7',
  'MONTHLY', 'QUARTERLY', 'ANNUAL'
);

create type access_title_status as enum ('VALID', 'USED', 'EXPIRED', 'SUSPENDED');

create type entry_result as enum ('GREEN', 'RED', 'YELLOW');

create type payment_method as enum ('CASSA', 'POS', 'ONLINE');

create type booking_status as enum ('CONFIRMED', 'CANCELLED', 'COMPLETED');

-- ---------------------------------------------------------------------------
-- 2. ORGANIZATIONS (multi-tenancy root)
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text default '#2563eb',
  address text,
  phone text,
  email text,
  setup_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. PROFILES (1:1 con auth.users, contiene org_id + role -> cuore del RBAC)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid references organizations (id) on delete cascade,
  role user_role not null default 'SEGRETERIA',
  approval_status approval_status not null default 'PENDING',
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  fiscal_code text,
  emergency_contact text,
  -- Solo per MEMBER_ATHLETE, ma teniamo il campo generico per storico check-in staff
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_org_id_idx on profiles (org_id);
create index profiles_role_idx on profiles (role);

-- ---------------------------------------------------------------------------
-- 4. ATHLETES (anagrafica clienti/atleti — separata dagli account staff)
-- ---------------------------------------------------------------------------
create table athletes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  fiscal_code text,
  birth_date date,
  photo_url text,
  emergency_contact text,
  notes text,
  qr_secret text not null default encode(gen_random_bytes(20), 'hex'), -- seed per TOTP dinamico
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index athletes_org_id_idx on athletes (org_id);
create index athletes_full_name_idx on athletes using gin (to_tsvector('simple', full_name));

-- ---------------------------------------------------------------------------
-- 5. MEDICAL CERTIFICATES
-- ---------------------------------------------------------------------------
create table medical_certificates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  athlete_id uuid not null references athletes (id) on delete cascade,
  issue_date date not null,
  expiry_date date not null,
  document_url text,
  created_at timestamptz not null default now()
);

create index medcert_athlete_idx on medical_certificates (athlete_id);
create index medcert_expiry_idx on medical_certificates (expiry_date);

-- ---------------------------------------------------------------------------
-- 6. FACILITIES & SPACES (planner)
-- ---------------------------------------------------------------------------
create table facilities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  discipline discipline not null,
  created_at timestamptz not null default now()
);

create table spaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  facility_id uuid not null references facilities (id) on delete cascade,
  name text not null, -- es. "Corsia 1", "Campo Padel 2"
  capacity integer not null default 1,
  created_at timestamptz not null default now()
);

create index spaces_facility_idx on spaces (facility_id);

-- ---------------------------------------------------------------------------
-- 7. PRICING PLANS (abbonamenti, carnet, corsi, noleggi)
-- ---------------------------------------------------------------------------
create table pricing_plans (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('SUBSCRIPTION','PUNCH_CARD','COURSE','GIFT_CARD','RENTAL','SINGLE_ENTRY')),
  period subscription_period,
  days_per_week integer, -- per abbonamenti "N giorni a settimana"
  total_credits integer, -- per carnet
  price_cents integer not null,
  discipline discipline,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index pricing_plans_org_idx on pricing_plans (org_id);

-- ---------------------------------------------------------------------------
-- 8. ACCESS TITLES (il "titolo di accesso" attivo/scalabile del cliente)
--    Copre: abbonamenti a periodo, carnet, biglietti singoli, gift card
-- ---------------------------------------------------------------------------
create table access_titles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  athlete_id uuid not null references athletes (id) on delete cascade,
  pricing_plan_id uuid references pricing_plans (id),
  kind text not null check (kind in ('SUBSCRIPTION','PUNCH_CARD','SINGLE_ENTRY','GIFT_CARD')),
  status access_title_status not null default 'VALID',
  starts_on date,
  ends_on date,
  days_per_week integer,
  remaining_credits integer, -- per carnet / gift card a ingressi
  remaining_balance_cents integer, -- per gift card a saldo euro
  qr_code text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

create index access_titles_athlete_idx on access_titles (athlete_id);
create index access_titles_org_idx on access_titles (org_id);
create unique index access_titles_qr_idx on access_titles (qr_code);

-- Storico utilizzo settimanale per il controllo "giorni/settimana" degli abbonamenti
create table subscription_usage_weeks (
  id uuid primary key default gen_random_uuid(),
  access_title_id uuid not null references access_titles (id) on delete cascade,
  iso_year integer not null,
  iso_week integer not null,
  uses_count integer not null default 0,
  unique (access_title_id, iso_year, iso_week)
);

-- ---------------------------------------------------------------------------
-- 9. COURSES & ENROLLMENTS
-- ---------------------------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  discipline discipline not null,
  instructor_id uuid references profiles (id),
  space_id uuid references spaces (id),
  level text,
  capacity integer not null default 10,
  created_at timestamptz not null default now()
);

create table course_shifts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = lunedì
  start_time time not null,
  end_time time not null
);

create table course_enrollments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  athlete_id uuid not null references athletes (id) on delete cascade,
  access_title_id uuid references access_titles (id),
  enrolled_at timestamptz not null default now(),
  unique (course_id, athlete_id)
);

create table course_attendance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  athlete_id uuid not null references athletes (id) on delete cascade,
  session_date date not null,
  present boolean not null default true,
  marked_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (course_id, athlete_id, session_date)
);

-- ---------------------------------------------------------------------------
-- 10. STAFF SHIFTS (turni personale)
-- ---------------------------------------------------------------------------
create table staff_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 11. FIELD / SPACE BOOKINGS (noleggi flessibili)
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  athlete_id uuid references athletes (id),
  space_ids uuid[] not null, -- supporta corsia singola, gruppo corsie, intera vasca
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status booking_status not null default 'CONFIRMED',
  price_cents integer not null default 0,
  recurring_rule text, -- es. "WEEKLY" per stagionali
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index bookings_org_idx on bookings (org_id);
create index bookings_time_idx on bookings (starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- 12. ORDERS / SALES / RECEIPTS (flusso vendita store)
-- ---------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  -- Nullable: un biglietto singolo può essere venduto senza associarlo a un
  -- atleta (vendita anonima, es. ingresso occasionale non tracciato).
  athlete_id uuid references athletes (id),
  pricing_plan_id uuid references pricing_plans (id),
  access_title_id uuid references access_titles (id),
  booking_id uuid references bookings (id),
  amount_cents integer not null,
  payment_method payment_method not null,
  sold_by uuid references profiles (id),
  receipt_number text not null,
  created_at timestamptz not null default now()
);

create index orders_org_idx on orders (org_id);
create index orders_athlete_idx on orders (athlete_id);

-- ---------------------------------------------------------------------------
-- 13. ENTRY LOG (storico ingressi al varco / totem / check-in)
-- ---------------------------------------------------------------------------
create table entry_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  athlete_id uuid references athletes (id),
  access_title_id uuid references access_titles (id),
  gate text not null default 'MAIN', -- totem / checkin-desk
  result entry_result not null,
  reason text,
  scanned_by uuid references profiles (id), -- null se totem self-service
  created_at timestamptz not null default now()
);

create index entry_logs_athlete_idx on entry_logs (athlete_id);
create index entry_logs_org_idx on entry_logs (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 14. STAFF APPROVAL QUEUE (onboarding self-service)
-- ---------------------------------------------------------------------------
create table staff_approval_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  requested_role user_role not null,
  status approval_status not null default 'PENDING',
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================================
-- 15. FUNZIONI DI SUPPORTO PER LE POLICY RLS
-- =====================================================================================
-- IMPORTANTE: sono "security definer" con search_path fissato. Senza questo,
-- ogni chiamata a auth_org_id()/auth_role() dentro una policy RLS su
-- `profiles` andrebbe a sua volta incontro alla RLS di `profiles`, causando
-- doppie indirection che con le query annidate di PostgREST (es. il join
-- profiles -> organizations usato da getCurrentSession()) possono far
-- tornare `null` per righe a cui l'utente avrebbe invece pieno accesso.
-- Con security definer queste funzioni leggono `profiles` bypassando la RLS,
-- restituendo comunque solo org_id/role dell'utente corrente (auth.uid()):
-- nessun dato di altri utenti viene esposto.
create or replace function auth_org_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin_or_director()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth_role() in ('SUPER_ADMIN', 'DIRETTORE');
$$;

create or replace function is_staff_operativo()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth_role() in ('SUPER_ADMIN', 'DIRETTORE', 'COORDINATORE', 'SEGRETERIA');
$$;

-- =====================================================================================
-- 16. ROW LEVEL SECURITY — ISOLAMENTO PER org_id + PERMESSI PER RUOLO
-- =====================================================================================
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table athletes enable row level security;
alter table medical_certificates enable row level security;
alter table facilities enable row level security;
alter table spaces enable row level security;
alter table pricing_plans enable row level security;
alter table access_titles enable row level security;
alter table subscription_usage_weeks enable row level security;
alter table courses enable row level security;
alter table course_shifts enable row level security;
alter table course_enrollments enable row level security;
alter table course_attendance enable row level security;
alter table staff_shifts enable row level security;
alter table bookings enable row level security;
alter table orders enable row level security;
alter table entry_logs enable row level security;
alter table staff_approval_queue enable row level security;

-- ORGANIZATIONS: visibile solo alla propria org; modificabile solo da SUPER_ADMIN
-- L'INSERT è aperto a qualunque utente autenticato: è così che un nuovo cliente
-- crea la propria organizzazione dal wizard /setup-organization, prima ancora
-- di avere un profilo (quindi prima che auth_org_id() restituisca qualcosa).
create policy org_select on organizations for select
  using (id = auth_org_id());
create policy org_insert on organizations for insert
  with check (auth.uid() is not null);
create policy org_update on organizations for update
  using (id = auth_org_id() and auth_role() = 'SUPER_ADMIN');

-- PROFILES: si vede il proprio profilo + tutti quelli della stessa org se staff operativo
create policy profiles_select on profiles for select
  using (id = auth.uid() or org_id = auth_org_id());
create policy profiles_update_self on profiles for update
  using (id = auth.uid());
create policy profiles_manage_staff on profiles for update
  using (org_id = auth_org_id() and is_admin_or_director());
create policy profiles_insert on profiles for insert
  with check (id = auth.uid());

-- ATHLETES: isolamento per org, scrittura solo staff operativo (non ISTRUTTORE)
create policy athletes_select on athletes for select
  using (org_id = auth_org_id());
create policy athletes_write on athletes for insert
  with check (org_id = auth_org_id() and is_staff_operativo());
create policy athletes_update on athletes for update
  using (org_id = auth_org_id() and is_staff_operativo());

-- MEDICAL CERTIFICATES
create policy medcert_select on medical_certificates for select
  using (org_id = auth_org_id());
create policy medcert_write on medical_certificates for insert
  with check (org_id = auth_org_id() and is_staff_operativo());

-- FACILITIES & SPACES: lettura per tutti i membri org, scrittura Admin/Direttore
create policy facilities_select on facilities for select using (org_id = auth_org_id());
create policy facilities_write on facilities for insert
  with check (org_id = auth_org_id() and is_admin_or_director());
create policy facilities_update on facilities for update
  using (org_id = auth_org_id() and is_admin_or_director());

create policy spaces_select on spaces for select using (org_id = auth_org_id());
create policy spaces_write on spaces for insert
  with check (org_id = auth_org_id() and is_admin_or_director());

-- PRICING PLANS: scrittura SOLO Admin/Direttore (Coordinatore in sola lettura)
create policy pricing_select on pricing_plans for select using (org_id = auth_org_id());
create policy pricing_write on pricing_plans for insert
  with check (org_id = auth_org_id() and is_admin_or_director());
create policy pricing_update on pricing_plans for update
  using (org_id = auth_org_id() and is_admin_or_director());

-- ACCESS TITLES
create policy access_titles_select on access_titles for select using (org_id = auth_org_id());
create policy access_titles_write on access_titles for insert
  with check (org_id = auth_org_id() and is_staff_operativo());
create policy access_titles_update on access_titles for update
  using (org_id = auth_org_id() and is_staff_operativo());

create policy usage_weeks_select on subscription_usage_weeks for select
  using (access_title_id in (select id from access_titles where org_id = auth_org_id()));

-- COURSES: lettura org-wide; scrittura Admin/Direttore/Coordinatore
create policy courses_select on courses for select using (org_id = auth_org_id());
create policy courses_write on courses for insert
  with check (org_id = auth_org_id() and auth_role() in ('SUPER_ADMIN','DIRETTORE','COORDINATORE'));
create policy courses_update on courses for update
  using (org_id = auth_org_id() and auth_role() in ('SUPER_ADMIN','DIRETTORE','COORDINATORE'));

create policy shifts_select on course_shifts for select
  using (course_id in (select id from courses where org_id = auth_org_id()));

create policy enrollments_select on course_enrollments for select using (org_id = auth_org_id());
create policy enrollments_write on course_enrollments for insert
  with check (org_id = auth_org_id() and auth_role() in ('SUPER_ADMIN','DIRETTORE','COORDINATORE','SEGRETERIA'));

-- ATTENDANCE: istruttore può marcare presenza solo sui propri corsi
create policy attendance_select on course_attendance for select using (org_id = auth_org_id());
create policy attendance_write on course_attendance for insert
  with check (
    org_id = auth_org_id() and (
      is_admin_or_director()
      or auth_role() = 'COORDINATORE'
      or (auth_role() = 'ISTRUTTORE' and course_id in (
            select id from courses where instructor_id = auth.uid()
          ))
    )
  );

-- STAFF SHIFTS: ognuno vede i turni della propria org; check-in solo il proprio
create policy staff_shifts_select on staff_shifts for select using (org_id = auth_org_id());
create policy staff_shifts_write on staff_shifts for insert
  with check (org_id = auth_org_id() and auth_role() in ('SUPER_ADMIN','DIRETTORE','COORDINATORE'));
create policy staff_shifts_checkin on staff_shifts for update
  using (org_id = auth_org_id() and profile_id = auth.uid());

-- BOOKINGS (noleggi)
create policy bookings_select on bookings for select using (org_id = auth_org_id());
create policy bookings_write on bookings for insert
  with check (org_id = auth_org_id() and is_staff_operativo());

-- ORDERS (vendite): sola creazione da staff operativo, mai anonime (athlete_id NOT NULL)
create policy orders_select on orders for select using (org_id = auth_org_id());
create policy orders_write on orders for insert
  with check (org_id = auth_org_id() and is_staff_operativo());

-- ENTRY LOGS: lettura org-wide, scrittura da motore di validazione (staff o service role)
create policy entry_logs_select on entry_logs for select using (org_id = auth_org_id());
create policy entry_logs_write on entry_logs for insert
  with check (org_id = auth_org_id());

-- STAFF APPROVAL QUEUE: solo Admin/Direttore possono approvare
create policy approval_select on staff_approval_queue for select
  using (org_id = auth_org_id() and is_admin_or_director());
create policy approval_update on staff_approval_queue for update
  using (org_id = auth_org_id() and is_admin_or_director());
create policy approval_insert on staff_approval_queue for insert
  with check (org_id = auth_org_id());

-- =====================================================================================
-- 18. STORAGE — bucket documenti (certificati medici e allegati atleti)
-- =====================================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Convenzione path: documents/<org_id>/<athlete_id>/<file>
-- così le policy possono isolare i file per organizzazione leggendo il primo
-- segmento del path con storage.foldername(name).
create policy documents_select on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_org_id()::text
  );

create policy documents_insert on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_staff_operativo()
  );

create policy documents_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_org_id()::text
    and is_staff_operativo()
  );

-- =====================================================================================
-- 19. SEED DEMO
-- =====================================================================================
-- NOTA: per l'utente SUPER_ADMIN, crea prima l'utente in Supabase Auth
-- (Authentication -> Add User) con email demo@athletix.app, poi esegui:
--   update profiles set id = '<uuid-utente-auth>' where email = 'demo@athletix.app';
-- oppure inserisci direttamente la riga in profiles con l'id corretto.

insert into organizations (id, name, primary_color, address, phone, email, setup_completed)
values ('00000000-0000-0000-0000-000000000001', 'Athletix Sport Center', '#2563eb',
        'Via dello Sport 10, Milano', '+39 02 1234567', 'info@athletix-demo.app', true);

insert into facilities (id, org_id, name, discipline) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Piscina Coperta 25m','SWIMMING'),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Centro Padel','PADEL'),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Campo Calcio a 5','SOCCER');

insert into spaces (org_id, facility_id, name, capacity) values
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Corsia 1',1),
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Corsia 2',1),
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Corsia 3',1),
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Campo Padel 1',4),
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Campo Padel 2',4),
  ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Campo 5vs5',10);

insert into pricing_plans (org_id, name, kind, period, days_per_week, price_cents, discipline) values
  ('00000000-0000-0000-0000-000000000001','Abbonamento Mensile 3gg/sett','SUBSCRIPTION','MONTHLY',3,4500,'SWIMMING'),
  ('00000000-0000-0000-0000-000000000001','Abbonamento Trimestrale Full','SUBSCRIPTION','QUARTERLY',7,15000,'SWIMMING');

insert into pricing_plans (org_id, name, kind, total_credits, price_cents) values
  ('00000000-0000-0000-0000-000000000001','Carnet 10 Ingressi','PUNCH_CARD',10,8000);

comment on table organizations is 'Tenant root: ogni impianto sportivo cliente di Athletix';
comment on table access_titles is 'Titolo di accesso attivo/scalabile: abbonamento, carnet, biglietto singolo o gift card';
comment on column access_titles.qr_code is 'Codice statico stampabile; per QR dinamico anti-frode vedi athletes.qr_secret + TOTP lato client';
