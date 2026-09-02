-- Live LPS member roster (source: "LPS Members_Clients.xlsx", imported 2026-09-02
-- into the POWA Coach Supabase project). Schema only — the data itself is loaded
-- separately and never committed to this repository.
-- Contains PII including minors' records — locked to service-role access only.

create table public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  date_of_birth date,
  -- Original cell text kept when it couldn't be parsed to one date
  -- (e.g. two siblings' birthdates joined by "&" in a single cell).
  date_of_birth_raw text,
  sex text,
  email text,
  phone text,
  focus text,
  membership_type text,
  plan text,
  group_name text,
  goals text,
  past_injuries text,
  current_limitations text,
  guardian_name text,
  guardian_relation text,
  guardian_phone text,
  guardian_email text,
  create_parent_login boolean,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  -- Row number in the source spreadsheet, for traceability.
  source_row integer,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.members is
  'Live LPS member roster (source: LPS Members_Clients.xlsx). PII incl. minors — service-role access only; RLS deny-by-default.';

create index members_name_idx
  on public.members (lower(last_name), lower(first_name));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- Deny-by-default: RLS on with NO policies, and API-role privileges revoked.
-- Only the server-side service role can read or write rows.
alter table public.members enable row level security;
revoke all on table public.members from anon, authenticated;
