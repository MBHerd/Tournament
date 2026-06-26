import { validateMatchScore } from './validation.mjs';
import { createAuditEntry } from '../audit/audit-log.mjs';

export function submitScore({ match, games, submittedBy, note = '', format }) {
  const warnings = validateMatchScore({ games, format });
  return Object.freeze({
    matchId: match.matchId,
    submittedBy,
    submittedAt: new Date().toISOString(),
    status: 'Under review',
    games: games.map((game) => Object.freeze({ ...game })),
    warnings,
    note
  });
}

export function approveScore({ submission, approvedBy }) {
  if (!submission || submission.status !== 'Under review') throw new Error('Only under-review scores can be approved');
  const officialScore = Object.freeze({
    matchId: submission.matchId,
    approvedBy,
    approvedAt: new Date().toISOString(),
    submittedScore: submission,
    games: submission.games.map((game) => Object.freeze({ ...game })),
    status: 'Official/final'
  });
  const audit = createAuditEntry({
    actorId: approvedBy,
    action: 'score.approved',
    entityType: 'match',
    entityId: submission.matchId,
    detail: 'Approved submitted score and promoted it to official.'
  });
  return { officialScore, audit };
}
