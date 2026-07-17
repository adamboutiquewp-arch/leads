-- Expose email on profiles (denormalized from auth.users) so admins can see who's who
alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

-- Allow admins to grant an "unlimited" budget that bypasses the forfait cap
alter table public.subscriptions add column is_unlimited boolean not null default false;
