import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";
import { isSupabaseConfigured } from "@/src/lib/env";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getPrimarySnapshot } from "@/src/lib/tournament-data";

type Cell = string | number | boolean | null | undefined;
type Row = Record<string, Cell>;

export type OperationMatch = {
  id: string;
  matchId: string;
  division: string;
  pool: string;
  stage: string;
  court: string;
  team1: string;
  team2: string;
  team1Score: string;
  team2Score: string;
  status: string;
};

export type OperationStanding = {
  division: string;
  pool: string;
  rank: number;
  team: string;
  played: number;
  wins: number;
  losses: number;
  winPct: string;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

export type OperationsData = {
  source: "supabase" | "demo";
  tournamentName: string;
  matches: OperationMatch[];
  standings: OperationStanding[];
  bracket: OperationMatch[];
};

function nameOf(team: Row | undefined) {
  return String(team?.team_name ?? "");
}

function latestGameByMatch(games: Row[]) {
  const byMatch = new Map<string, Row>();
  for (const game of games) {
    if (game.match_id) byMatch.set(String(game.match_id), game);
  }
  return byMatch;
}

function calculateStandings(matches: Row[], gamesByMatch: Map<string, Row>, teamsById: Map<string, Row>, divisionsById: Map<string, Row>, poolsById: Map<string, Row>) {
  const rows = new Map<string, OperationStanding>();

  function ensure(teamId: string, match: Row) {
    const division = divisionsById.get(String(match.division_id));
    const pool = match.pool_id ? poolsById.get(String(match.pool_id)) : undefined;
    const key = `${match.division_id}|${match.pool_id ?? ""}|${teamId}`;
    if (!rows.has(key)) {
      rows.set(key, {
        division: String(division?.name ?? ""),
        pool: String(pool?.name ?? ""),
        rank: 0,
        team: nameOf(teamsById.get(teamId)),
        played: 0,
        wins: 0,
        losses: 0,
        winPct: "0.000",
        pointsFor: 0,
        pointsAgainst: 0,
        pointDiff: 0
      });
    }
    return rows.get(key)!;
  }

  for (const match of matches) {
    if (!match.team1_id || !match.team2_id) continue;
    const game = gamesByMatch.get(String(match.id));
    if (!game) continue;
    const t1Score = Number(game.team1_score ?? 0);
    const t2Score = Number(game.team2_score ?? 0);
    if (t1Score === t2Score) continue;

    const team1 = ensure(String(match.team1_id), match);
    const team2 = ensure(String(match.team2_id), match);
    team1.played += 1;
    team2.played += 1;
    team1.pointsFor += t1Score;
    team1.pointsAgainst += t2Score;
    team2.pointsFor += t2Score;
    team2.pointsAgainst += t1Score;
    if (t1Score > t2Score) {
      team1.wins += 1;
      team2.losses += 1;
    } else {
      team2.wins += 1;
      team1.losses += 1;
    }
    team1.pointDiff = team1.pointsFor - team1.pointsAgainst;
    team2.pointDiff = team2.pointsFor - team2.pointsAgainst;
    team1.winPct = (team1.wins / team1.played).toFixed(3);
    team2.winPct = (team2.wins / team2.played).toFixed(3);
  }

  const groups = new Map<string, OperationStanding[]>();
  for (const row of rows.values()) {
    const group = `${row.division}|${row.pool}`;
    groups.set(group, [...(groups.get(group) ?? []), row]);
  }

  const ranked: OperationStanding[] = [];
  for (const groupRows of groups.values()) {
    groupRows.sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor || a.team.localeCompare(b.team));
    groupRows.forEach((row, index) => {
      row.rank = index + 1;
      ranked.push(row);
    });
  }
  return ranked;
}

function demoOperationsData(): OperationsData {
  const demo = miniTournamentDemo();
  const officialScores = demo.officialScores as Record<string, { games?: Array<{ team1: number; team2: number }> }>;
  const matches = demo.matches.map((match) => {
    const game = officialScores[match.matchId]?.games?.[0];
    return {
      id: match.matchId,
      matchId: match.matchId,
      division: "Open Doubles",
      pool: String(match.pool ?? ""),
      stage: match.stage,
      court: match.courtName,
      team1: match.team1Name,
      team2: match.team2Name,
      team1Score: game ? String(game.team1) : "",
      team2Score: game ? String(game.team2) : "",
      status: game ? "official_final" : "scheduled"
    };
  });

  return {
    source: "demo",
    tournamentName: demo.tournament.name,
    matches,
    standings: [],
    bracket: matches.filter((match) => match.stage !== "Pool Play")
  };
}

export async function getOperationsData(): Promise<OperationsData> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return demoOperationsData();

  const snapshot = await getPrimarySnapshot();
  if (snapshot.source !== "supabase") return demoOperationsData();

  const supabase = createSupabaseAdminClient();
  const tournamentId = snapshot.tournament.id;

  const [divisionsRes, poolsRes, teamsRes, matchesRes, courtsRes, gamesRes] = await Promise.all([
    supabase.from("divisions").select("*").eq("tournament_id", tournamentId).order("name"),
    supabase.from("pools").select("*").order("sort_order"),
    supabase.from("teams").select("*").eq("tournament_id", tournamentId),
    supabase.from("matches").select("*").eq("tournament_id", tournamentId).order("planned_start_time", { nullsFirst: false }).order("human_match_id"),
    supabase.from("courts").select("*").eq("tournament_id", tournamentId).order("sort_order"),
    supabase.from("match_games").select("*").order("game_number")
  ]);

  const divisions = (divisionsRes.data ?? []) as Row[];
  const pools = (poolsRes.data ?? []) as Row[];
  const teams = (teamsRes.data ?? []) as Row[];
  const matches = (matchesRes.data ?? []) as Row[];
  const courts = (courtsRes.data ?? []) as Row[];
  const games = (gamesRes.data ?? []) as Row[];

  const divisionsById = new Map(divisions.map((row) => [String(row.id), row]));
  const poolsById = new Map(pools.map((row) => [String(row.id), row]));
  const teamsById = new Map(teams.map((row) => [String(row.id), row]));
  const courtsById = new Map(courts.map((row) => [String(row.id), row]));
  const gamesByMatch = latestGameByMatch(games);

  const operationMatches = matches.map((match) => {
    const division = divisionsById.get(String(match.division_id));
    const pool = match.pool_id ? poolsById.get(String(match.pool_id)) : undefined;
    const court = match.court_id ? courtsById.get(String(match.court_id)) : undefined;
    const team1 = match.team1_id ? teamsById.get(String(match.team1_id)) : undefined;
    const team2 = match.team2_id ? teamsById.get(String(match.team2_id)) : undefined;
    const game = gamesByMatch.get(String(match.id));
    return {
      id: String(match.id),
      matchId: String(match.human_match_id ?? ""),
      division: String(division?.name ?? ""),
      pool: String(pool?.name ?? ""),
      stage: String(match.match_type ?? ""),
      court: String(court?.name ?? ""),
      team1: nameOf(team1),
      team2: nameOf(team2),
      team1Score: game ? String(game.team1_score ?? "") : "",
      team2Score: game ? String(game.team2_score ?? "") : "",
      status: String(match.status ?? "")
    };
  });

  return {
    source: "supabase",
    tournamentName: snapshot.tournament.name,
    matches: operationMatches,
    standings: calculateStandings(matches, gamesByMatch, teamsById, divisionsById, poolsById),
    bracket: operationMatches.filter((match) => match.stage !== "pool")
  };
}
