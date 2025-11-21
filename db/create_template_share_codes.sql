create table if not exists public.template_share_codes (
  id text primary key,
  template jsonb not null,
  created_at timestamptz not null default now()
);
