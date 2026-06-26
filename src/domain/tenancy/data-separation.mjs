export function assertSameOrganization(record, organizationId) {
  if (!record || record.organizationId !== organizationId) {
    throw new Error('Organization data boundary violation');
  }
  return record;
}

export function filterByOrganization(records, organizationId) {
  return records.filter((record) => record.organizationId === organizationId);
}

export function requireOrganizationAccess(actor, organizationId) {
  if (!actor) throw new Error('Missing actor');
  if (actor.role === 'Platform Admin') return true;
  if (actor.organizationId !== organizationId) throw new Error('Organization access denied');
  return true;
}
