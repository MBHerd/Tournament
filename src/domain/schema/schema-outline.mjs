export const schemaGroups = Object.freeze([
  {
    name: 'Platform and Auth',
    description: 'Organizer tenancy, application users, memberships, and auth profile references.',
    tables: ['organizations', 'organization_memberships', 'users']
  },
  {
    name: 'Players and Registration',
    description: 'Players remain separate from users, allowing guest registration and duplicate warnings.',
    tables: ['players', 'custom_fields', 'custom_field_values', 'teams', 'team_players', 'registrations', 'waiver_acceptances', 'player_check_ins']
  },
  {
    name: 'Tournament Setup',
    description: 'Tournaments, venues, courts, divisions, formats, and combined-division history.',
    tables: ['tournaments', 'venues', 'courts', 'court_availability_blocks', 'divisions', 'division_combinations', 'match_formats']
  },
  {
    name: 'Competition Engine',
    description: 'Pools, matches, submitted results, official results, game-level rows, standings, and brackets.',
    tables: ['pools', 'pool_teams', 'matches', 'match_result_submissions', 'official_match_results', 'match_games', 'standing_snapshots', 'standing_rows', 'brackets', 'bracket_seeds', 'bracket_matches']
  },
  {
    name: 'Live Operations',
    description: 'Referee assignment, unavailability, volunteer roles, and volunteer shifts.',
    tables: ['referee_assignments', 'referee_unavailability', 'volunteer_roles', 'volunteer_shifts']
  },
  {
    name: 'Communication and Display',
    description: 'Announcements, notification events, and public TV/display settings.',
    tables: ['announcements', 'notification_events', 'public_display_settings']
  },
  {
    name: 'Files, Imports, Exports, Scoresheets',
    description: 'Uploaded assets, spreadsheet import jobs, export jobs, and scoresheet batches.',
    tables: ['files', 'import_jobs', 'export_jobs', 'scoresheet_batches']
  },
  {
    name: 'Audit',
    description: 'Append-only audit trail for admin-visible history and reports.',
    tables: ['audit_logs']
  }
]);

export const requiredTables = Object.freeze(schemaGroups.flatMap((group) => group.tables));

export const statusCatalog = Object.freeze({
  tournament: ['draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'archived', 'canceled'],
  division: ['draft', 'registration_open', 'registration_closed', 'pools_generated', 'schedule_generated', 'in_progress', 'bracket_ready', 'bracket_published', 'completed', 'canceled'],
  team: ['pending', 'confirmed', 'waitlisted', 'withdrawn', 'disqualified'],
  payment: ['unpaid', 'partial', 'paid', 'refunded', 'waived'],
  match: ['not_scheduled', 'scheduled', 'called_to_court', 'in_progress', 'submitted_by_referee', 'under_review', 'official_final', 'disputed', 'delayed', 'completed', 'forfeited', 'canceled'],
  result: ['submitted', 'under_review', 'rejected', 'approved'],
  bracket: ['draft', 'generated', 'edited', 'published', 'completed']
});

export const dataSeparationRules = Object.freeze([
  'Every admin query is scoped by organization unless the actor is Platform Admin.',
  'Tournament-level staff only access tournaments where they have permission.',
  'Public queries return only published public data.',
  'Public views hide email, phone, emergency contacts, payment status, internal notes, and audit logs.'
]);
