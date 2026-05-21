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
    new.assigned_user_id::text,
    '/incoming-leads/' || new.id::text
  );

  return new;
end;
$$;