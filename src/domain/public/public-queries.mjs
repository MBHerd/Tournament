export const publicHiddenFields = Object.freeze([
  'email',
  'phone',
  'contact_email',
  'contact_phone',
  'emergency_contact_name',
  'emergency_contact_phone',
  'payment_status',
  'payment_method',
  'amount_paid',
  'payment_received_date',
  'notes',
  'internal_notes',
  'audit_logs'
]);

export function sanitizePublicPlayer(player) {
  return {
    id: player.id,
    first_name: player.first_name,
    last_name: player.last_name,
    gender: player.gender,
    skill_level: player.skill_level,
    home_city_club: player.home_city_club
  };
}

export function sanitizePublicTeam(team) {
  return {
    id: team.id,
    team_name: team.team_name,
    status: team.status,
    seed: team.seed,
    division_id: team.division_id,
    players: (team.players || []).map(sanitizePublicPlayer)
  };
}

export function sanitizePublicTournament(tournament) {
  if (!tournament.public_page_enabled) return null;
  return {
    id: tournament.id,
    organization_id: tournament.organization_id,
    name: tournament.name,
    slug: tournament.slug,
    description: tournament.description,
    start_date: tournament.start_date,
    end_date: tournament.end_date,
    timezone: tournament.timezone,
    public_results_enabled: tournament.public_results_enabled,
    rules_summary: tournament.rules_summary,
    map_url: tournament.map_url
  };
}

export function assertNoPublicLeak(record) {
  const found = publicHiddenFields.filter((field) => Object.prototype.hasOwnProperty.call(record, field));
  if (found.length) throw new Error('Public data leak: ' + found.join(', '));
  return true;
}
