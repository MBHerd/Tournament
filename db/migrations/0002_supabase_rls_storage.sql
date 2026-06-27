-- Supabase deployment layer for Auth, Row Level Security, and Storage.
-- Run after 0001_foundation.sql in a Supabase project.

alter table public.users add column if not exists supabase_auth_user_id uuid;
create unique index if not exists idx_users_supabase_auth_user_id
  on public.users(supabase_auth_user_id)
  where supabase_auth_user_id is not null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (supabase_auth_user_id, auth_provider_id, email, name)
  values (
    new.id,
    new.id::text,
    coalesce(new.email, new.id::text || '@supabase.local'),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email, 'Tournament user')
  )
  on conflict (email) do update
    set supabase_auth_user_id = coalesce(public.users.supabase_auth_user_id, excluded.supabase_auth_user_id),
        auth_provider_id = coalesce(public.users.auth_provider_id, excluded.auth_provider_id),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.supabase_auth_user_id = auth.uid()
     or u.auth_provider_id = auth.uid()::text
  limit 1;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = public.current_user_id()
      and u.platform_role = 'platform_admin'
  );
$$;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = target_organization_id
        and m.user_id = public.current_user_id()
        and m.status = 'active'
    );
$$;

create or replace function public.can_manage_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.organization_memberships m
      where m.organization_id = target_organization_id
        and m.user_id = public.current_user_id()
        and m.status = 'active'
        and m.role in ('organization_owner','tournament_director','event_manager')
    );
$$;

create or replace function public.has_tournament_access(target_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_admin()
    or exists (
      select 1
      from public.tournaments t
      where t.id = target_tournament_id
        and public.is_org_member(t.organization_id)
    );
$$;

create or replace function public.can_read_public_tournament(target_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = target_tournament_id
      and t.public_page_enabled = true
      and t.status in ('published','registration_open','registration_closed','in_progress','completed')
  );
$$;

create or replace function public.storage_org_folder(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  folder_value text;
begin
  folder_value := nullif(split_part(object_name, '/', 1), '');
  if folder_value is null then
    return null;
  end if;

  return folder_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations','users','organization_memberships','players','venues','tournaments','courts',
    'court_availability_blocks','match_formats','divisions','division_combinations','custom_fields',
    'teams','team_players','waiver_acceptances','registrations','player_check_ins','pools',
    'pool_teams','brackets','matches','match_result_submissions','official_match_results',
    'match_games','standing_snapshots','standing_rows','bracket_seeds','bracket_matches',
    'referee_assignments','referee_unavailability','volunteer_roles','volunteer_shifts',
    'announcements','notification_events','public_display_settings','files','custom_field_values',
    'import_jobs','export_jobs','scoresheet_batches','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.organizations, public.tournaments, public.venues, public.divisions,
  public.courts, public.matches, public.announcements, public.public_display_settings
  to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

drop policy if exists "public organizations are readable" on public.organizations;
create policy "public organizations are readable"
on public.organizations for select to anon, authenticated
using (public_profile_enabled = true or public.is_org_member(id));

drop policy if exists "org managers manage organizations" on public.organizations;
create policy "org managers manage organizations"
on public.organizations for all to authenticated
using (public.can_manage_org(id))
with check (public.can_manage_org(id));

drop policy if exists "users read own profile" on public.users;
create policy "users read own profile"
on public.users for select to authenticated
using (
  id = public.current_user_id()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.organization_memberships mine
    join public.organization_memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = public.current_user_id()
      and mine.status = 'active'
      and theirs.user_id = public.users.id
      and theirs.status = 'active'
  )
);

drop policy if exists "users update own profile" on public.users;
create policy "users update own profile"
on public.users for update to authenticated
using (id = public.current_user_id() or public.is_platform_admin())
with check (id = public.current_user_id() or public.is_platform_admin());

drop policy if exists "users insert own profile" on public.users;
create policy "users insert own profile"
on public.users for insert to authenticated
with check (supabase_auth_user_id = auth.uid() or auth_provider_id = auth.uid()::text or public.is_platform_admin());

drop policy if exists "memberships are visible to members" on public.organization_memberships;
create policy "memberships are visible to members"
on public.organization_memberships for select to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "org managers manage memberships" on public.organization_memberships;
create policy "org managers manage memberships"
on public.organization_memberships for all to authenticated
using (public.can_manage_org(organization_id))
with check (public.can_manage_org(organization_id));

drop policy if exists "players read own or staff" on public.players;
create policy "players read own or staff"
on public.players for select to authenticated
using (
  user_id = public.current_user_id()
  or public.is_platform_admin()
  or exists (
    select 1
    from public.registrations r
    where r.player_id = public.players.id
      and public.has_tournament_access(r.tournament_id)
  )
  or exists (
    select 1
    from public.team_players tp
    join public.teams tm on tm.id = tp.team_id
    where tp.player_id = public.players.id
      and public.has_tournament_access(tm.tournament_id)
  )
);

drop policy if exists "players manage own or staff" on public.players;
create policy "players manage own or staff"
on public.players for all to authenticated
using (
  user_id = public.current_user_id()
  or exists (
    select 1
    from public.registrations r
    where r.player_id = public.players.id
      and public.has_tournament_access(r.tournament_id)
  )
)
with check (
  user_id = public.current_user_id()
  or exists (
    select 1
    from public.registrations r
    where r.player_id = public.players.id
      and public.has_tournament_access(r.tournament_id)
  )
);

drop policy if exists "public tournaments are readable" on public.tournaments;
create policy "public tournaments are readable"
on public.tournaments for select to anon, authenticated
using (public.can_read_public_tournament(id) or public.is_org_member(organization_id));

drop policy if exists "org members manage tournaments" on public.tournaments;
create policy "org members manage tournaments"
on public.tournaments for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "public venues are readable" on public.venues;
create policy "public venues are readable"
on public.venues for select to anon, authenticated
using (
  public.is_org_member(organization_id)
  or exists (
    select 1 from public.tournaments t
    where t.venue_id = public.venues.id
      and public.can_read_public_tournament(t.id)
  )
);

drop policy if exists "org members manage venues" on public.venues;
create policy "org members manage venues"
on public.venues for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "match formats visible to org" on public.match_formats;
create policy "match formats visible to org"
on public.match_formats for select to authenticated
using (organization_id is null or public.is_org_member(organization_id));

drop policy if exists "org members manage match formats" on public.match_formats;
create policy "org members manage match formats"
on public.match_formats for all to authenticated
using (public.is_platform_admin() or public.is_org_member(organization_id))
with check (public.is_platform_admin() or public.is_org_member(organization_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'custom_fields','files','audit_logs'
  ] loop
    execute format('drop policy if exists "org members can access org rows" on public.%I', table_name);
    execute format(
      'create policy "org members can access org rows" on public.%I for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'courts','divisions','division_combinations','teams','waiver_acceptances','registrations',
    'player_check_ins','referee_unavailability','volunteer_roles','volunteer_shifts',
    'announcements','notification_events','public_display_settings','import_jobs',
    'export_jobs','scoresheet_batches'
  ] loop
    execute format('drop policy if exists "staff can access tournament rows" on public.%I', table_name);
    execute format(
      'create policy "staff can access tournament rows" on public.%I for all to authenticated using (public.has_tournament_access(tournament_id)) with check (public.has_tournament_access(tournament_id))',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "public divisions are readable" on public.divisions;
create policy "public divisions are readable"
on public.divisions for select to anon, authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = public.divisions.tournament_id
      and public.can_read_public_tournament(t.id)
  )
);

drop policy if exists "public courts are readable" on public.courts;
create policy "public courts are readable"
on public.courts for select to anon, authenticated
using (public.can_read_public_tournament(tournament_id));

drop policy if exists "public display settings are readable" on public.public_display_settings;
create policy "public display settings are readable"
on public.public_display_settings for select to anon, authenticated
using (public.can_read_public_tournament(tournament_id));

drop policy if exists "public announcements are readable" on public.announcements;
create policy "public announcements are readable"
on public.announcements for select to anon, authenticated
using (
  audience_type = 'public'
  and published_at is not null
  and public.can_read_public_tournament(tournament_id)
);

drop policy if exists "public matches are readable when results are enabled" on public.matches;
create policy "public matches are readable when results are enabled"
on public.matches for select to anon, authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = public.matches.tournament_id
      and public.can_read_public_tournament(t.id)
      and t.public_results_enabled = true
  )
);

drop policy if exists "staff can access court availability" on public.court_availability_blocks;
create policy "staff can access court availability"
on public.court_availability_blocks for all to authenticated
using (
  exists (
    select 1 from public.courts c
    where c.id = public.court_availability_blocks.court_id
      and public.has_tournament_access(c.tournament_id)
  )
)
with check (
  exists (
    select 1 from public.courts c
    where c.id = public.court_availability_blocks.court_id
      and public.has_tournament_access(c.tournament_id)
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['pools','brackets','standing_snapshots'] loop
    execute format('drop policy if exists "staff can access division rows" on public.%I', table_name);
    execute format(
      'create policy "staff can access division rows" on public.%I for all to authenticated using (exists (select 1 from public.divisions d where d.id = division_id and public.has_tournament_access(d.tournament_id))) with check (exists (select 1 from public.divisions d where d.id = division_id and public.has_tournament_access(d.tournament_id)))',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "staff can access pool teams" on public.pool_teams;
create policy "staff can access pool teams"
on public.pool_teams for all to authenticated
using (
  exists (
    select 1
    from public.pools p
    join public.divisions d on d.id = p.division_id
    where p.id = public.pool_teams.pool_id
      and public.has_tournament_access(d.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.pools p
    join public.divisions d on d.id = p.division_id
    where p.id = public.pool_teams.pool_id
      and public.has_tournament_access(d.tournament_id)
  )
);

drop policy if exists "staff can access team players" on public.team_players;
create policy "staff can access team players"
on public.team_players for all to authenticated
using (
  exists (
    select 1 from public.teams tm
    where tm.id = public.team_players.team_id
      and public.has_tournament_access(tm.tournament_id)
  )
)
with check (
  exists (
    select 1 from public.teams tm
    where tm.id = public.team_players.team_id
      and public.has_tournament_access(tm.tournament_id)
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'match_result_submissions','official_match_results','match_games','referee_assignments'
  ] loop
    execute format('drop policy if exists "staff can access match rows" on public.%I', table_name);
    execute format(
      'create policy "staff can access match rows" on public.%I for all to authenticated using (exists (select 1 from public.matches m where m.id = match_id and public.has_tournament_access(m.tournament_id))) with check (exists (select 1 from public.matches m where m.id = match_id and public.has_tournament_access(m.tournament_id)))',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "staff can access standings" on public.standing_rows;
create policy "staff can access standings"
on public.standing_rows for all to authenticated
using (
  exists (
    select 1
    from public.standing_snapshots s
    join public.divisions d on d.id = s.division_id
    where s.id = public.standing_rows.snapshot_id
      and public.has_tournament_access(d.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.standing_snapshots s
    join public.divisions d on d.id = s.division_id
    where s.id = public.standing_rows.snapshot_id
      and public.has_tournament_access(d.tournament_id)
  )
);

drop policy if exists "staff can access bracket seeds" on public.bracket_seeds;
create policy "staff can access bracket seeds"
on public.bracket_seeds for all to authenticated
using (
  exists (
    select 1
    from public.brackets b
    join public.divisions d on d.id = b.division_id
    where b.id = public.bracket_seeds.bracket_id
      and public.has_tournament_access(d.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.brackets b
    join public.divisions d on d.id = b.division_id
    where b.id = public.bracket_seeds.bracket_id
      and public.has_tournament_access(d.tournament_id)
  )
);

drop policy if exists "staff can access bracket matches" on public.bracket_matches;
create policy "staff can access bracket matches"
on public.bracket_matches for all to authenticated
using (
  exists (
    select 1
    from public.brackets b
    join public.divisions d on d.id = b.division_id
    where b.id = public.bracket_matches.bracket_id
      and public.has_tournament_access(d.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.brackets b
    join public.divisions d on d.id = b.division_id
    where b.id = public.bracket_matches.bracket_id
      and public.has_tournament_access(d.tournament_id)
  )
);

drop policy if exists "staff can access custom field values" on public.custom_field_values;
create policy "staff can access custom field values"
on public.custom_field_values for all to authenticated
using (
  exists (
    select 1
    from public.custom_fields cf
    where cf.id = public.custom_field_values.custom_field_id
      and public.is_org_member(cf.organization_id)
  )
  or exists (
    select 1
    from public.registrations r
    where r.id = public.custom_field_values.registration_id
      and public.has_tournament_access(r.tournament_id)
  )
  or exists (
    select 1
    from public.teams tm
    where tm.id = public.custom_field_values.team_id
      and public.has_tournament_access(tm.tournament_id)
  )
  or exists (
    select 1
    from public.players p
    where p.id = public.custom_field_values.player_id
      and p.user_id = public.current_user_id()
  )
)
with check (
  exists (
    select 1
    from public.custom_fields cf
    where cf.id = public.custom_field_values.custom_field_id
      and public.is_org_member(cf.organization_id)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true, 52428800, array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('tournament-files', 'tournament-files', false, 104857600, array['application/pdf','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public assets are readable" on storage.objects;
create policy "public assets are readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'public-assets');

drop policy if exists "org members upload public assets" on storage.objects;
create policy "org members upload public assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'public-assets'
  and public.is_org_member(public.storage_org_folder(name))
);

drop policy if exists "org members update public assets" on storage.objects;
create policy "org members update public assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'public-assets'
  and public.is_org_member(public.storage_org_folder(name))
)
with check (
  bucket_id = 'public-assets'
  and public.is_org_member(public.storage_org_folder(name))
);

drop policy if exists "org members delete public assets" on storage.objects;
create policy "org members delete public assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'public-assets'
  and public.is_org_member(public.storage_org_folder(name))
);

drop policy if exists "org members read private files" on storage.objects;
create policy "org members read private files"
on storage.objects for select to authenticated
using (
  bucket_id = 'tournament-files'
  and public.is_org_member(public.storage_org_folder(name))
);

drop policy if exists "org members upload private files" on storage.objects;
create policy "org members upload private files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tournament-files'
  and public.is_org_member(public.storage_org_folder(name))
);

drop policy if exists "org members update private files" on storage.objects;
create policy "org members update private files"
on storage.objects for update to authenticated
using (
  bucket_id = 'tournament-files'
  and public.is_org_member(public.storage_org_folder(name))
)
with check (
  bucket_id = 'tournament-files'
  and public.is_org_member(public.storage_org_folder(name))
);

drop policy if exists "org members delete private files" on storage.objects;
create policy "org members delete private files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tournament-files'
  and public.is_org_member(public.storage_org_folder(name))
);
