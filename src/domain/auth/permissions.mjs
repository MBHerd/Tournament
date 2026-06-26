export const roles = [
  'Platform Admin',
  'Organization Owner',
  'Tournament Director',
  'Event Manager',
  'Registration Manager',
  'Scorekeeper',
  'Referee',
  'Volunteer',
  'Player',
  'Public Viewer'
];

export const rolePermissions = Object.freeze({
  'Platform Admin': ['*'],
  'Organization Owner': [
    'organizations.view',
    'organizations.manage',
    'staff.manage',
    'roles.assign',
    'tournaments.create',
    'tournaments.manage',
    'tournaments.view',
    'audit.organization_view'
  ],
  'Tournament Director': [
    'tournaments.create',
    'tournaments.manage',
    'tournaments.view',
    'venues.manage',
    'divisions.manage',
    'registrations.manage',
    'payments.manage',
    'pools.generate',
    'matches.generate',
    'schedules.manage',
    'scores.enter',
    'scores.approve',
    'standings.view',
    'brackets.manage',
    'public.publish',
    'scoresheets.print',
    'audit.tournament_view'
  ],
  'Event Manager': [
    'tournaments.view',
    'divisions.manage',
    'pools.generate',
    'matches.generate',
    'schedules.manage',
    'scores.enter',
    'standings.view',
    'scoresheets.print'
  ],
  'Registration Manager': ['tournaments.view', 'registrations.manage', 'payments.manage', 'players.manage', 'audit.tournament_view'],
  'Scorekeeper': ['tournaments.view', 'matches.view', 'scores.enter', 'scores.approve', 'standings.view'],
  Referee: ['matches.assigned_view', 'scores.submit'],
  Volunteer: ['matches.view', 'courts.view', 'scoresheets.print'],
  Player: ['player.dashboard', 'registrations.own_view', 'public.view'],
  'Public Viewer': ['public.view']
});

export function can(actor, permission, context = {}) {
  if (!actor || !actor.role || !permission) return false;
  const permissions = rolePermissions[actor.role] || [];
  if (permissions.includes('*')) return true;
  if (!permissions.includes(permission)) return false;
  if (context.organizationId && actor.organizationId && actor.organizationId !== context.organizationId) return false;
  if (context.tournamentId && actor.tournamentIds && !actor.tournamentIds.includes(context.tournamentId)) return false;
  return true;
}

export function requirePermission(actor, permission, context = {}) {
  if (!can(actor, permission, context)) {
    throw new Error('Permission denied: ' + permission);
  }
  return true;
}
