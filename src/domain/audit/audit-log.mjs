export function createAuditEntry({ actorId, action, entityType, entityId, detail, organizationId, tournamentId }) {
  return Object.freeze({
    auditId: 'AUD-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    actorId,
    action,
    entityType,
    entityId,
    detail,
    organizationId,
    tournamentId,
    createdAt: new Date().toISOString()
  });
}

export function appendAudit(log, entry) {
  return Object.freeze([entry, ...log]);
}
