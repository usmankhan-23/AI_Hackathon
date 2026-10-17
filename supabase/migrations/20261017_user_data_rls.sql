-- Apply in the Supabase SQL Editor after reviewing the project's existing policies.
-- The restrictive policies ensure any other permissive policy cannot broaden
-- access beyond the authenticated row owner.

alter table public.reading_profiles enable row level security;
alter table public.saved_editions enable row level security;

create unique index if not exists reading_profiles_user_id_unique_idx
  on public.reading_profiles (user_id);

grant select, insert, update, delete on public.reading_profiles to authenticated;
grant select, insert, update, delete on public.saved_editions to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reading_profiles' and policyname = 'subah_stage_20261017_profiles_owner_access') then
    execute 'create policy subah_stage_20261017_profiles_owner_access on public.reading_profiles as permissive for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reading_profiles' and policyname = 'subah_stage_20261017_profiles_owner_restriction') then
    execute 'create policy subah_stage_20261017_profiles_owner_restriction on public.reading_profiles as restrictive for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_editions' and policyname = 'subah_stage_20261017_editions_owner_access') then
    execute 'create policy subah_stage_20261017_editions_owner_access on public.saved_editions as permissive for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'saved_editions' and policyname = 'subah_stage_20261017_editions_owner_restriction') then
    execute 'create policy subah_stage_20261017_editions_owner_restriction on public.saved_editions as restrictive for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
  end if;
end $$;
