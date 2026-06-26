insert into organizations (id, name, slug, description, contact_email, public_profile_enabled) values
('10000000-0000-0000-0000-000000000001', 'Gingoog Pickleball Club', 'gingoog-pickleball', 'Community pickleball organization in Gingoog City.', 'owner@example.com', true)
on conflict (id) do nothing;

insert into users (id, auth_provider_id, email, name, platform_role) values
('20000000-0000-0000-0000-000000000001', 'demo|owner', 'owner@example.com', 'Mara Santos', 'standard_user'),
('20000000-0000-0000-0000-000000000002', 'demo|td', 'td@example.com', 'Jun Dela Cruz', 'standard_user'),
('20000000-0000-0000-0000-000000000003', 'demo|scorekeeper', 'scorekeeper@example.com', 'Kaye Uy', 'standard_user'),
('20000000-0000-0000-0000-000000000004', 'demo|referee', 'referee@example.com', 'Rico Lim', 'standard_user'),
('20000000-0000-0000-0000-000000000005', 'demo|platform', 'platform@example.com', 'Platform Admin', 'platform_admin')
on conflict (id) do nothing;

insert into organization_memberships (organization_id, user_id, role, status, invited_by_user_id, invited_at, accepted_at) values
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'organization_owner', 'active', null, now(), now()),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'tournament_director', 'active', '20000000-0000-0000-0000-000000000001', now(), now()),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'scorekeeper', 'active', '20000000-0000-0000-0000-000000000001', now(), now()),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'referee', 'active', '20000000-0000-0000-0000-000000000001', now(), now())
on conflict do nothing;

insert into venues (id, organization_id, name, address, city, region, country, map_url) values
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Gingoog City Sports Complex', 'City Sports Complex', 'Gingoog', 'Misamis Oriental', 'Philippines', 'https://maps.example.com/gingoog')
on conflict (id) do nothing;

insert into tournaments (id, organization_id, name, slug, description, start_date, end_date, status, venue_id, registration_opens_at, registration_closes_at, registration_close_enabled, public_page_enabled, public_results_enabled, waiver_text, age_method, rules_summary, contact_email, contact_phone, created_by_user_id) values
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Gingoog Open 2026', 'gingoog-open-2026', 'Seeded mini tournament for foundation demos.', '2026-07-18', '2026-07-19', 'in_progress', '30000000-0000-0000-0000-000000000001', '2026-06-01 08:00+08', '2026-07-10 18:00+08', true, true, true, 'Demo waiver text snapshot.', 'age_on_tournament_date', 'Traditional doubles pool play into single-elimination bracket with bronze match.', 'td@example.com', '+63 900 000 0000', '20000000-0000-0000-0000-000000000002')
on conflict (organization_id, slug) do nothing;

insert into courts (id, tournament_id, venue_id, name, court_number, court_type, sort_order) values
('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Championship Court', 1, 'physical', 1),
('41000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Court 2', 2, 'physical', 2),
('41000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Court 3', 3, 'physical', 3),
('41000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Court 4', 4, 'physical', 4)
on conflict (id) do nothing;

insert into match_formats (id, organization_id, name, format_type, target_points, win_by, best_of_games, scoring_type) values
('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '1x11 WB2 Side-Out', 'single_game', 11, 2, 1, 'side_out'),
('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '1x15 WB2 Rally', 'single_game', 15, 2, 1, 'rally')
on conflict (id) do nothing;

insert into divisions (id, tournament_id, name, event_type, skill_label, numeric_skill, age_group, registration_fee, pool_size_setting, teams_advance_per_pool, bronze_match_enabled, pool_match_format_id, bracket_match_format_id, status) values
('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Open Doubles', 'open_doubles', 'Open', 'open', 'open', 750, 4, 2, true, '50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'bracket_published')
on conflict (id) do nothing;

insert into players (id, first_name, last_name, email, phone, gender, skill_level, home_city_club, emergency_contact_name, emergency_contact_phone, duplicate_warning_key) values
('70000000-0000-0000-0000-000000000001', 'Ana', 'Santos', 'ana@example.com', '+63 900 000 0001', 'female', '4.0', 'Gingoog Club', 'Emergency 1', '+63 900 100 0001', 'ana-santos'),
('70000000-0000-0000-0000-000000000002', 'Marco', 'Cruz', 'marco@example.com', '+63 900 000 0002', 'male', '4.0', 'Gingoog Club', 'Emergency 2', '+63 900 100 0002', 'marco-cruz'),
('70000000-0000-0000-0000-000000000003', 'Lia', 'Reyes', 'lia@example.com', '+63 900 000 0003', 'female', '3.5', 'CDO Club', 'Emergency 3', '+63 900 100 0003', 'lia-reyes'),
('70000000-0000-0000-0000-000000000004', 'Rafael', 'Lim', 'rafael@example.com', '+63 900 000 0004', 'male', '3.5', 'CDO Club', 'Emergency 4', '+63 900 100 0004', 'rafael-lim')
on conflict (id) do nothing;

insert into teams (id, tournament_id, division_id, original_division_id, team_name, status, payment_status, payment_method, amount_paid, payment_received_date, seed, approved_by_user_id, approved_at) values
('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'North Smash', 'confirmed', 'paid', 'gcash', 750, '2026-06-15', 1, '20000000-0000-0000-0000-000000000003', now()),
('80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Harbor Dinks', 'confirmed', 'paid', 'cash', 750, '2026-06-16', 2, '20000000-0000-0000-0000-000000000003', now())
on conflict (id) do nothing;

insert into team_players (team_id, player_id, role, partner_confirmed) values
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'player_1', true),
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'player_2', true),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003', 'player_1', true),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'player_2', true)
on conflict do nothing;

insert into pools (id, division_id, name, sort_order) values
('90000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Pool A', 1)
on conflict (division_id, name) do nothing;

insert into pool_teams (pool_id, team_id, seed) values
('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 1),
('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 2)
on conflict do nothing;

insert into matches (id, tournament_id, division_id, pool_id, human_match_id, match_type, match_format_id, team1_id, team2_id, status, court_id, planned_start_time, assigned_referee_user_id, assigned_scorekeeper_user_id) values
('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'OD-PA-M01', 'pool', '50000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'official_final', '41000000-0000-0000-0000-000000000001', '2026-07-18 08:00+08', '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003')
on conflict (tournament_id, human_match_id) do nothing;

insert into match_result_submissions (id, match_id, submitted_by_user_id, winner_team_id, result_status, notes) values
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000001', 'approved', 'Demo referee phone submission.')
on conflict (id) do nothing;

insert into official_match_results (id, match_id, approved_submission_id, approved_by_user_id, winner_team_id, loser_team_id, result_type) values
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', 'normal')
on conflict (match_id) do nothing;

insert into match_games (match_id, result_submission_id, game_number, team1_score, team2_score, winner_team_id) values
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 15, 11, '80000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into match_games (match_id, official_result_id, game_number, team1_score, team2_score, winner_team_id) values
('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1, 15, 11, '80000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public_display_settings (tournament_id) values
('40000000-0000-0000-0000-000000000001')
on conflict (tournament_id) do nothing;

insert into audit_logs (organization_id, tournament_id, actor_user_id, action_type, entity_type, entity_id, before_json, after_json, reason) values
('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'organization_created', 'organization', '10000000-0000-0000-0000-000000000001', null, '{"slug":"gingoog-pickleball"}', 'Seed organization created.'),
('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'tournament_created', 'tournament', '40000000-0000-0000-0000-000000000001', null, '{"slug":"gingoog-open-2026"}', 'Seed tournament created.'),
('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'score_approved', 'match', 'a0000000-0000-0000-0000-000000000001', '{"status":"under_review"}', '{"status":"official_final"}', 'Seed score approved.');
