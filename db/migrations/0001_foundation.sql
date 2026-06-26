create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_file_id uuid,
  banner_file_id uuid,
  contact_email text,
  contact_phone text,
  website_url text,
  public_profile_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_provider_id text unique,
  email text not null unique,
  name text not null,
  phone text,
  avatar_file_id uuid,
  platform_role text not null default 'standard_user' check (platform_role in ('platform_admin','standard_user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('organization_owner','tournament_director','event_manager','registration_manager','scorekeeper','referee','volunteer')),
  status text not null default 'active' check (status in ('invited','active','suspended','removed')),
  invited_by_user_id uuid references users(id),
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id, role)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  gender text,
  birthdate date,
  age_bracket text,
  skill_level text,
  home_city_club text,
  emergency_contact_name text,
  emergency_contact_phone text,
  duplicate_warning_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  city text,
  region text,
  country text not null default 'Philippines',
  map_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  start_date date,
  end_date date,
  timezone text not null default 'Asia/Manila',
  status text not null default 'draft' check (status in ('draft','published','registration_open','registration_closed','in_progress','completed','archived','canceled')),
  venue_id uuid references venues(id) on delete set null,
  logo_file_id uuid,
  banner_file_id uuid,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  registration_close_enabled boolean not null default false,
  public_page_enabled boolean not null default false,
  public_results_enabled boolean not null default false,
  waiver_text text,
  age_method text not null default 'age_on_tournament_date' check (age_method in ('exact_birthdate','age_on_tournament_date','player_selected_age_bracket')),
  rules_summary text,
  contact_email text,
  contact_phone text,
  map_url text,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(organization_id, slug)
);

create table if not exists courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  court_number integer,
  court_type text not null default 'physical' check (court_type in ('physical','virtual_queue')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists court_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references courts(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('available','unavailable','reserved','break','maintenance')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists match_formats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  format_type text not null,
  target_points integer not null,
  win_by integer not null default 2,
  best_of_games integer not null default 1,
  scoring_type text not null check (scoring_type in ('side_out','rally')),
  custom_rules_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  event_type text not null check (event_type in ('mens_doubles','womens_doubles','mixed_doubles','open_doubles')),
  skill_label text,
  numeric_skill text,
  age_group text not null default 'open',
  is_junior boolean not null default false,
  custom_name text,
  capacity_limit integer,
  waitlist_enabled boolean not null default true,
  registration_fee numeric(10,2) not null default 0,
  pool_size_setting integer not null default 4,
  auto_balance_pools boolean not null default true,
  advancement_type text not null default 'top_per_pool',
  teams_advance_per_pool integer not null default 2,
  wildcard_count integer not null default 0,
  bronze_match_enabled boolean not null default true,
  pool_match_format_id uuid references match_formats(id),
  bracket_match_format_id uuid references match_formats(id),
  time_block_start timestamptz,
  time_block_end timestamptz,
  status text not null default 'draft' check (status in ('draft','registration_open','registration_closed','pools_generated','schedule_generated','in_progress','bracket_ready','bracket_published','completed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (time_block_end is null or time_block_start is null or time_block_end > time_block_start)
);

create table if not exists division_combinations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  primary_division_id uuid not null references divisions(id) on delete cascade,
  combined_division_id uuid not null references divisions(id) on delete cascade,
  reason text,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  check (primary_division_id <> combined_division_id)
);

create table if not exists custom_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  division_id uuid references divisions(id) on delete cascade,
  label text not null,
  field_key text not null,
  field_type text not null check (field_type in ('text','number','dropdown','checkbox','date','file_upload')),
  required boolean not null default false,
  options_json jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, tournament_id, division_id, field_key)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  original_division_id uuid references divisions(id) on delete set null,
  team_name text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','waitlisted','withdrawn','disqualified')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','refunded','waived')),
  payment_method text,
  amount_paid numeric(10,2) not null default 0,
  payment_received_date date,
  seed integer,
  notes text,
  approved_by_user_id uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  role text not null check (role in ('player_1','player_2','substitute')),
  partner_confirmed boolean not null default false,
  substitute_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(team_id, player_id, role)
);

create table if not exists waiver_acceptances (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  waiver_text_snapshot text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  acceptance_method text not null,
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  player_id uuid not null references players(id) on delete cascade,
  registration_type text not null check (registration_type in ('online_guest','online_account','admin_manual','import')),
  status text not null default 'pending' check (status in ('pending','confirmed','waitlisted','withdrawn','disqualified')),
  needs_partner boolean not null default false,
  partner_invite_email text,
  partner_invite_token text,
  waiver_acceptance_id uuid references waiver_acceptances(id) on delete set null,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists player_check_ins (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checked_in_by_user_id uuid references users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id, player_id)
);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(division_id, name)
);

create table if not exists pool_teams (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  seed integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pool_id, team_id)
);

create table if not exists brackets (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  name text not null,
  bracket_type text not null check (bracket_type in ('single_elimination')),
  status text not null default 'draft' check (status in ('draft','generated','edited','published','completed')),
  published_at timestamptz,
  published_by_user_id uuid references users(id),
  bronze_match_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  pool_id uuid references pools(id) on delete set null,
  bracket_id uuid references brackets(id) on delete set null,
  bracket_round text,
  human_match_id text not null,
  match_type text not null check (match_type in ('pool','bracket','bronze','final','consolation')),
  match_format_id uuid references match_formats(id),
  team1_id uuid references teams(id),
  team2_id uuid references teams(id),
  winner_team_id uuid references teams(id),
  loser_team_id uuid references teams(id),
  status text not null default 'not_scheduled' check (status in ('not_scheduled','scheduled','called_to_court','in_progress','submitted_by_referee','under_review','official_final','disputed','delayed','completed','forfeited','canceled')),
  court_id uuid references courts(id),
  virtual_queue_id uuid references courts(id),
  planned_start_time timestamptz,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  queue_number integer,
  assigned_referee_user_id uuid references users(id),
  assigned_scorekeeper_user_id uuid references users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id, human_match_id)
);

create table if not exists match_result_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  submitted_by_user_id uuid references users(id),
  submitted_at timestamptz not null default now(),
  winner_team_id uuid references teams(id),
  result_status text not null default 'submitted' check (result_status in ('submitted','under_review','rejected','approved')),
  notes text,
  dispute_notes text,
  created_at timestamptz not null default now()
);

create table if not exists official_match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  approved_submission_id uuid references match_result_submissions(id) on delete set null,
  approved_by_user_id uuid references users(id),
  approved_at timestamptz not null default now(),
  winner_team_id uuid references teams(id),
  loser_team_id uuid references teams(id),
  result_type text not null default 'normal' check (result_type in ('normal','forfeit','injury_retirement','weather_delay','double_forfeit','administrative_decision')),
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  result_submission_id uuid references match_result_submissions(id) on delete cascade,
  official_result_id uuid references official_match_results(id) on delete cascade,
  game_number integer not null,
  team1_score integer not null,
  team2_score integer not null,
  winner_team_id uuid references teams(id),
  created_at timestamptz not null default now(),
  check ((result_submission_id is not null and official_result_id is null) or (result_submission_id is null and official_result_id is not null)),
  check (team1_score >= 0 and team2_score >= 0)
);

create table if not exists standing_snapshots (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id) on delete cascade,
  pool_id uuid references pools(id) on delete set null,
  snapshot_type text not null check (snapshot_type in ('live_after_score_approval','manual_override','bracket_seed_snapshot','final')),
  created_after_match_id uuid references matches(id) on delete set null,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists standing_rows (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references standing_snapshots(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  rank integer not null,
  match_wins integer not null default 0,
  match_losses integer not null default 0,
  games_won integer not null default 0,
  games_lost integer not null default 0,
  game_differential integer not null default 0,
  points_won integer not null default 0,
  points_allowed integer not null default 0,
  point_differential integer not null default 0,
  tiebreaker_explanation text,
  manual_override boolean not null default false,
  override_reason text,
  created_at timestamptz not null default now()
);

create table if not exists bracket_seeds (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references brackets(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  seed integer not null,
  source text not null check (source in ('pool_winner','pool_rank','wildcard_standings','manual_selection')),
  source_pool_id uuid references pools(id) on delete set null,
  is_wildcard boolean not null default false,
  manually_adjusted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bracket_id, seed)
);

create table if not exists bracket_matches (
  id uuid primary key default gen_random_uuid(),
  bracket_id uuid not null references brackets(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  round_name text not null,
  round_number integer not null,
  position integer not null,
  next_match_id uuid,
  next_match_slot text,
  is_bronze_match boolean not null default false,
  is_final boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(bracket_id, round_number, position)
);

alter table bracket_matches
  drop constraint if exists bracket_matches_next_match_id_fkey,
  add constraint bracket_matches_next_match_id_fkey foreign key (next_match_id) references bracket_matches(id) on delete set null;

create table if not exists referee_assignments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned','accepted','declined','completed','removed')),
  assigned_by_user_id uuid references users(id),
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, user_id)
);

create table if not exists referee_unavailability (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id, name)
);

create table if not exists volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  volunteer_role_id uuid not null references volunteer_roles(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled','checked_in','completed','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  title text not null,
  body text not null,
  audience_type text not null check (audience_type in ('all_players','selected_division','staff','volunteers','referees','public')),
  division_id uuid references divisions(id) on delete set null,
  created_by_user_id uuid references users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  recipient_user_id uuid references users(id) on delete set null,
  recipient_player_id uuid references players(id) on delete set null,
  channel text not null check (channel in ('email','sms_later')),
  event_type text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','queued','sent','failed','canceled')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public_display_settings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null unique references tournaments(id) on delete cascade,
  show_current_matches boolean not null default true,
  show_upcoming_matches boolean not null default true,
  show_recent_results boolean not null default true,
  show_court_assignments boolean not null default true,
  show_pool_standings boolean not null default true,
  show_bracket boolean not null default true,
  show_announcements boolean not null default true,
  show_sponsor_slides boolean not null default false,
  show_medalists boolean not null default true,
  show_qr_code boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  uploaded_by_user_id uuid references users(id) on delete set null,
  file_type text not null check (file_type in ('logo','banner','receipt_photo','waiver_pdf','import_spreadsheet','export_file','tournament_packet','custom_pdf_template_later')),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists custom_field_values (
  id uuid primary key default gen_random_uuid(),
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  registration_id uuid references registrations(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_date date,
  value_boolean boolean,
  file_id uuid references files(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player_id is not null or team_id is not null or registration_id is not null)
);

create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  file_id uuid not null references files(id),
  import_type text not null check (import_type in ('players','teams')),
  status text not null default 'uploaded' check (status in ('uploaded','previewed','validated','imported','failed','canceled')),
  preview_json jsonb not null default '{}'::jsonb,
  validation_errors_json jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists export_jobs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  export_type text not null check (export_type in ('player_list','team_list','schedule','referee_assignments','volunteer_schedule','audit_log')),
  status text not null default 'requested' check (status in ('requested','running','completed','failed','canceled')),
  file_id uuid references files(id) on delete set null,
  requested_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists scoresheet_batches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  generated_by_user_id uuid references users(id),
  file_id uuid references files(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tournament_id uuid references tournaments(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  before_json jsonb,
  after_json jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table organizations
  drop constraint if exists organizations_logo_file_id_fkey,
  add constraint organizations_logo_file_id_fkey foreign key (logo_file_id) references files(id) on delete set null,
  drop constraint if exists organizations_banner_file_id_fkey,
  add constraint organizations_banner_file_id_fkey foreign key (banner_file_id) references files(id) on delete set null;

alter table users
  drop constraint if exists users_avatar_file_id_fkey,
  add constraint users_avatar_file_id_fkey foreign key (avatar_file_id) references files(id) on delete set null;

alter table tournaments
  drop constraint if exists tournaments_logo_file_id_fkey,
  add constraint tournaments_logo_file_id_fkey foreign key (logo_file_id) references files(id) on delete set null,
  drop constraint if exists tournaments_banner_file_id_fkey,
  add constraint tournaments_banner_file_id_fkey foreign key (banner_file_id) references files(id) on delete set null;

create index if not exists idx_organizations_slug on organizations(slug);
create index if not exists idx_tournaments_organization_id on tournaments(organization_id);
create index if not exists idx_tournaments_slug on tournaments(slug);
create index if not exists idx_divisions_tournament_id on divisions(tournament_id);
create index if not exists idx_teams_tournament_id on teams(tournament_id);
create index if not exists idx_teams_division_id on teams(division_id);
create index if not exists idx_players_email on players(email);
create index if not exists idx_players_phone on players(phone);
create index if not exists idx_players_duplicate_warning_key on players(duplicate_warning_key);
create index if not exists idx_matches_tournament_id on matches(tournament_id);
create index if not exists idx_matches_division_id on matches(division_id);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_matches_court_id on matches(court_id);
create index if not exists idx_matches_planned_start_time on matches(planned_start_time);
create index if not exists idx_match_games_match_id on match_games(match_id);
create index if not exists idx_standing_snapshots_division_id on standing_snapshots(division_id);
create index if not exists idx_brackets_division_id on brackets(division_id);
create index if not exists idx_audit_logs_organization_id on audit_logs(organization_id);
create index if not exists idx_audit_logs_tournament_id on audit_logs(tournament_id);
create index if not exists idx_audit_logs_actor_user_id on audit_logs(actor_user_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_registrations_tournament_id on registrations(tournament_id);
create index if not exists idx_score_submissions_match_id on match_result_submissions(match_id);
create index if not exists idx_official_results_match_id on official_match_results(match_id);

create or replace function prevent_audit_log_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs are immutable';
end;
$$;

drop trigger if exists audit_logs_no_update on audit_logs;
create trigger audit_logs_no_update before update on audit_logs for each row execute function prevent_audit_log_mutation();

drop trigger if exists audit_logs_no_delete on audit_logs;
create trigger audit_logs_no_delete before delete on audit_logs for each row execute function prevent_audit_log_mutation();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations','users','organization_memberships','players','venues','tournaments','courts','court_availability_blocks','match_formats','divisions','custom_fields','teams','team_players','registrations','player_check_ins','pools','pool_teams','brackets','matches','official_match_results','standing_rows','bracket_seeds','bracket_matches','referee_assignments','referee_unavailability','volunteer_roles','volunteer_shifts','announcements','public_display_settings','custom_field_values'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on %I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  end loop;
end;
$$;
