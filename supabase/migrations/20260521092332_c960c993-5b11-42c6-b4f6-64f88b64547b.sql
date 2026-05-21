
-- 1. Extend incoming_leads
alter table public.incoming_leads
  add column if not exists engagement_status text default 'New',
  add column if not exists assigned_user_id  uuid,
  add column if not exists assigned_at       timestamptz,
  add column if not exists last_contact_at   timestamptz,
  add column if not exists last_outcome      text,
  add column if not exists nurture_reason    text,
  add column if not exists nurture_until     date;

create index if not exists idx_incoming_leads_assigned_user
  on public.incoming_leads(assigned_user_id);

-- 2. Contact attempts log
create table if not exists public.lead_contact_attempts (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.incoming_leads(id) on delete cascade,
  channel       text not null,                         -- call|email|linkedin|meeting|other
  outcome       text not null,                         -- no_answer|left_voicemail|reached|bounced|replied|scheduled|unreachable|other
  notes         text,
  performed_by  uuid,
  performed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_lead_contact_attempts_lead
  on public.lead_contact_attempts(lead_id, performed_at desc);

alter table public.lead_contact_attempts enable row level security;

drop policy if exists lca_select on public.lead_contact_attempts;
create policy lca_select on public.lead_contact_attempts
  for select to authenticated
  using (
    public.is_hq_user(auth.uid())
    or exists (
      select 1 from public.incoming_leads il
      where il.id = lead_contact_attempts.lead_id
        and il.linked_partner_id is not null
        and il.linked_partner_id = public.get_user_partner_id(auth.uid())
    )
  );

drop policy if exists lca_insert on public.lead_contact_attempts;
create policy lca_insert on public.lead_contact_attempts
  for insert to authenticated
  with check (
    public.is_hq_user(auth.uid())
    or exists (
      select 1 from public.incoming_leads il
      where il.id = lead_contact_attempts.lead_id
        and il.linked_partner_id is not null
        and il.linked_partner_id = public.get_user_partner_id(auth.uid())
    )
  );

drop policy if exists lca_update on public.lead_contact_attempts;
create policy lca_update on public.lead_contact_attempts
  for update to authenticated
  using (
    public.is_hq_user(auth.uid())
    or exists (
      select 1 from public.incoming_leads il
      where il.id = lead_contact_attempts.lead_id
        and il.linked_partner_id is not null
        and il.linked_partner_id = public.get_user_partner_id(auth.uid())
    )
  );

drop policy if exists lca_delete on public.lead_contact_attempts;
create policy lca_delete on public.lead_contact_attempts
  for delete to authenticated
  using (public.has_role(auth.uid(), 'hq_admin'::app_role));

-- 3. Lead-assignment notification trigger
create or replace function public.notify_lead_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _company text;
  _country text;
begin
  if new.assigned_user_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.assigned_user_id is not distinct from old.assigned_user_id then
    return new;
  end if;

  new.assigned_at := now();

  _company := coalesce(new.company_name, 'Unnamed lead');
  _country := coalesce(' (' || new.country || ')', '');

  insert into public.notifications (title, message, type, category, target_user_id, action_url)
  values (
    'New incoming lead assigned',
    'You have a new lead to qualify: ' || _company || _country,
    'lead',
    'lead_assigned',
    new.assigned_user_id,
    '/incoming-leads/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_lead_assignment on public.incoming_leads;
create trigger trg_notify_lead_assignment
before insert or update of assigned_user_id on public.incoming_leads
for each row execute function public.notify_lead_assignment();
