import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";
import { isSupabaseConfigured } from "@/src/lib/env";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getPrimarySnapshot } from "@/src/lib/tournament-data";

export const exportDefinitions = [
  { kind: "teams", label: "Teams", filename: "himsog-teams.csv" },
  { kind: "schedule", label: "Schedule", filename: "himsog-schedule.csv" },
  { kind: "score-entry", label: "Score Entry", filename: "himsog-score-entry.csv" },
  { kind: "standings", label: "Standings", filename: "himsog-standings.csv" },
  { kind: "rankings", label: "Rankings", filename: "himsog-rankings.csv" },
  { kind: "bracket", label: "Bracket", filename: "himsog-bracket.csv" },
  { kind: "scoresheet-data", label: "Scoresheet Data", filename: "himsog-scoresheet-data.csv" },
  { kind: "registrations", label: "Registrations", filename: "himsog-registrations.csv" },
  { kind: "audit", label: "Audit Log", filename: "himsog-audit-log.csv" }
] as const;

export type ExportKind = (typeof exportDefinitions)[number]["kind"];

type CsvCell = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvCell>;

const teamHeaders = ["Skill Group", "Prefix", "Pool", "Team #", "Team ID", "Player 1", "Player 2", "Status", "Payment Status", "Seed"];
const scheduleHeaders = ["Day", "Block", "Start", "End", "Court", "Match", "Division", "Pool", "Stage", "Team 1", "Team 2", "Status"];
const scoreEntryHeaders = ["Seq #", "Match ID", "Day", "Block", "Start", "End", "Court", "Division", "Pool", "Stage", "Team 1", "Team 2", "Team 1 Score", "Team 2 Score", "Completed?", "Winner", "Loser", "Team 1 Win", "Team 2 Win", "Team 1 Point Diff", "Team 2 Point Diff"];
const standingsHeaders = ["Skill Group", "Pool", "Team", "Matches Played", "Wins", "Losses", "Win %", "Points For", "Points Against", "Point Differential", "Head-to-Head Wins vs Tied Teams", "Rank in Pool", "Rank Key"];
const rankingHeaders = ["Skill Group", "Pool", "Rank", "Team", "Matches Played", "Wins", "Losses", "Win %", "Point Differential", "Head-to-Head Wins"];
const bracketHeaders = ["Division", "Prefix", "Match ID", "Round", "Matchup", "Team 1 Source", "Team 2 Source", "Duration", "Notes"];
const scoresheetHeaders = ["Print?", "Event", "Time", "Match", "Court", "Referee", "Format", "TID1", "T1P1", "T1P2", "TID2", "T2P1", "T2P2"];
const registrationHeaders = ["registrationId", "teamId", "division", "player1", "player2", "contact", "status", "paymentStatus", "paymentMethod", "amountPaid", "source", "partnerStatus", "waiverAccepted"];
const auditHeaders = ["timestamp", "actor", "action", "detail", "auditId"];

function csvEscape(value: CsvCell) {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: CsvRow[]) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\r\n");
}

function prefixFor(name: string) {
  return name
    .split(/[\s/-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function compactDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function scoreFormat(format: Record<string, CsvCell> | undefined) {
  if (!format) return "";
  const bestOf = Number(format.best_of_games ?? 1);
  const target = Number(format.target_points ?? 0);
  const winBy = Number(format.win_by ?? 0);
  return `${bestOf}x${target}${winBy ? ` WB${winBy}` : ""}`;
}

function csvForDemo(kind: ExportKind) {
  const demo = miniTournamentDemo();
  const officialScores = demo.officialScores as Record<string, { games?: Array<{ team1: number; team2: number }> }>;
  const teams = demo.teams.map((team, index) => ({
    "Skill Group": "Open Doubles",
    Prefix: "OD",
    Pool: team.pool,
    "Team #": index + 1,
    "Team ID": team.teamName,
    "Player 1": "",
    "Player 2": "",
    Status: "confirmed",
    "Payment Status": "",
    Seed: index + 1
  }));
  const matches = demo.matches.map((match, index) => {
    const score = officialScores[match.matchId]?.games?.[0];
    const completed = score != null;
    const team1Score = score?.team1 ?? "";
    const team2Score = score?.team2 ?? "";
    const winner = score ? (score.team1 > score.team2 ? match.team1Name : match.team2Name) : "";
    const loser = score ? (score.team1 > score.team2 ? match.team2Name : match.team1Name) : "";
    return {
      "Seq #": index + 1,
      "Match ID": match.matchId,
      Day: "",
      Block: "",
      Start: "",
      End: "",
      Court: match.courtName,
      Division: "Open Doubles",
      Pool: match.pool,
      Stage: "Pool Play",
      "Team 1": match.team1Name,
      "Team 2": match.team2Name,
      "Team 1 Score": team1Score,
      "Team 2 Score": team2Score,
      "Completed?": completed ? "Yes" : "",
      Winner: winner,
      Loser: loser,
      "Team 1 Win": score ? Number(score.team1 > score.team2) : "",
      "Team 2 Win": score ? Number(score.team2 > score.team1) : "",
      "Team 1 Point Diff": score ? score.team1 - score.team2 : "",
      "Team 2 Point Diff": score ? score.team2 - score.team1 : ""
    };
  });

  if (kind === "teams") return toCsv(teamHeaders, teams);
  if (kind === "score-entry") return toCsv(scoreEntryHeaders, matches);
  if (kind === "scoresheet-data") {
    return toCsv(scoresheetHeaders, matches.map((row) => ({
      "Print?": "",
      Event: row.Division,
      Time: row.Start,
      Match: row["Match ID"],
      Court: row.Court,
      Referee: "",
      Format: "1x11 WB2",
      TID1: row["Team 1"],
      T1P1: "",
      T1P2: "",
      TID2: row["Team 2"],
      T2P1: "",
      T2P2: ""
    })));
  }
  if (kind === "schedule") return toCsv(scheduleHeaders, matches.map((row) => ({ ...row, Match: row["Match ID"], Status: row["Completed?"] ? "official_final" : "scheduled" })));
  if (kind === "audit") return toCsv(auditHeaders, demo.auditLog.map((entry) => ({ timestamp: entry.createdAt, actor: entry.actorId, action: entry.action, detail: entry.detail, auditId: entry.auditId })));
  if (kind === "standings") return toCsv(standingsHeaders, []);
  if (kind === "rankings") return toCsv(rankingHeaders, []);
  if (kind === "bracket") return toCsv(bracketHeaders, []);
  return toCsv(registrationHeaders, []);
}

function fullName(player: Record<string, CsvCell> | undefined) {
  if (!player) return "";
  return [player.first_name, player.last_name].filter(Boolean).join(" ");
}

function makeTeamName(team: Record<string, CsvCell> | undefined) {
  return String(team?.team_name ?? "");
}

function latestGameByMatch(games: Record<string, CsvCell>[]) {
  const byMatch = new Map<string, Record<string, CsvCell>>();
  for (const game of games) {
    if (game.match_id) byMatch.set(String(game.match_id), game);
  }
  return byMatch;
}

function standingsFromMatches(
  matches: Record<string, CsvCell>[],
  divisionsById: Map<string, Record<string, CsvCell>>,
  poolsById: Map<string, Record<string, CsvCell>>,
  teamsById: Map<string, Record<string, CsvCell>>,
  gamesByMatch: Map<string, Record<string, CsvCell>>
) {
  const rows = new Map<string, CsvRow>();

  function ensure(teamId: string, match: Record<string, CsvCell>) {
    const team = teamsById.get(teamId);
    const division = divisionsById.get(String(match.division_id));
    const pool = match.pool_id ? poolsById.get(String(match.pool_id)) : undefined;
    const key = `${String(match.division_id)}|${String(match.pool_id ?? "")}|${teamId}`;
    if (!rows.has(key)) {
      rows.set(key, {
        "Skill Group": String(division?.name ?? ""),
        Pool: String(pool?.name ?? ""),
        Team: makeTeamName(team),
        "Matches Played": 0,
        Wins: 0,
        Losses: 0,
        "Win %": 0,
        "Points For": 0,
        "Points Against": 0,
        "Point Differential": 0,
        "Head-to-Head Wins vs Tied Teams": 0,
        "Rank in Pool": "",
        "Rank Key": ""
      });
    }
    return rows.get(key)!;
  }

  for (const match of matches) {
    const game = gamesByMatch.get(String(match.id));
    if (!game || !match.team1_id || !match.team2_id) continue;
    const t1Score = Number(game.team1_score ?? 0);
    const t2Score = Number(game.team2_score ?? 0);
    if (t1Score === t2Score) continue;

    const t1 = ensure(String(match.team1_id), match);
    const t2 = ensure(String(match.team2_id), match);
    t1["Matches Played"] = Number(t1["Matches Played"]) + 1;
    t2["Matches Played"] = Number(t2["Matches Played"]) + 1;
    t1["Points For"] = Number(t1["Points For"]) + t1Score;
    t1["Points Against"] = Number(t1["Points Against"]) + t2Score;
    t2["Points For"] = Number(t2["Points For"]) + t2Score;
    t2["Points Against"] = Number(t2["Points Against"]) + t1Score;
    t1["Point Differential"] = Number(t1["Points For"]) - Number(t1["Points Against"]);
    t2["Point Differential"] = Number(t2["Points For"]) - Number(t2["Points Against"]);
    if (t1Score > t2Score) {
      t1.Wins = Number(t1.Wins) + 1;
      t2.Losses = Number(t2.Losses) + 1;
    } else {
      t2.Wins = Number(t2.Wins) + 1;
      t1.Losses = Number(t1.Losses) + 1;
    }
    t1["Win %"] = Number(t1.Wins) / Number(t1["Matches Played"]);
    t2["Win %"] = Number(t2.Wins) / Number(t2["Matches Played"]);
  }

  const grouped = new Map<string, CsvRow[]>();
  for (const row of rows.values()) {
    const group = `${row["Skill Group"]}|${row.Pool}`;
    grouped.set(group, [...(grouped.get(group) ?? []), row]);
  }

  const ranked: CsvRow[] = [];
  for (const groupRows of grouped.values()) {
    groupRows.sort((a, b) =>
      Number(b["Win %"]) - Number(a["Win %"]) ||
      Number(b["Point Differential"]) - Number(a["Point Differential"]) ||
      String(a.Team).localeCompare(String(b.Team))
    );
    groupRows.forEach((row, index) => {
      row["Rank in Pool"] = index + 1;
      row["Rank Key"] = `${row["Skill Group"]}|${row.Pool}|${index + 1}`;
      ranked.push(row);
    });
  }
  return ranked;
}

export async function buildInteropCsv(kind: ExportKind) {
  const definition = exportDefinitions.find((item) => item.kind === kind);
  if (!definition) return null;

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { filename: definition.filename, csv: csvForDemo(kind) };
  }

  const snapshot = await getPrimarySnapshot();
  if (snapshot.source !== "supabase") return { filename: definition.filename, csv: csvForDemo(kind) };

  const supabase = createSupabaseAdminClient();
  const tournamentId = snapshot.tournament.id;
  const organizationId = snapshot.organization.id;

  const [
    divisionsRes,
    poolsRes,
    teamsRes,
    playersRes,
    teamPlayersRes,
    matchesRes,
    courtsRes,
    formatsRes,
    gamesRes,
    registrationsRes,
    auditRes,
    bracketRes
  ] = await Promise.all([
    supabase.from("divisions").select("*").eq("tournament_id", tournamentId).order("name"),
    supabase.from("pools").select("*").order("sort_order"),
    supabase.from("teams").select("*").eq("tournament_id", tournamentId).order("seed", { nullsFirst: false }),
    supabase.from("players").select("*").order("last_name"),
    supabase.from("team_players").select("*").order("role"),
    supabase.from("matches").select("*").eq("tournament_id", tournamentId).order("planned_start_time", { nullsFirst: false }).order("human_match_id"),
    supabase.from("courts").select("*").eq("tournament_id", tournamentId).order("sort_order"),
    supabase.from("match_formats").select("*").eq("organization_id", organizationId),
    supabase.from("match_games").select("*").order("game_number"),
    supabase.from("registrations").select("*").eq("tournament_id", tournamentId).order("submitted_at"),
    supabase.from("audit_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    supabase.from("bracket_matches").select("*").order("round_number").order("position")
  ]);

  const divisions = (divisionsRes.data ?? []) as Record<string, CsvCell>[];
  const pools = (poolsRes.data ?? []) as Record<string, CsvCell>[];
  const teams = (teamsRes.data ?? []) as Record<string, CsvCell>[];
  const players = (playersRes.data ?? []) as Record<string, CsvCell>[];
  const teamPlayers = (teamPlayersRes.data ?? []) as Record<string, CsvCell>[];
  const matches = (matchesRes.data ?? []) as Record<string, CsvCell>[];
  const courts = (courtsRes.data ?? []) as Record<string, CsvCell>[];
  const formats = (formatsRes.data ?? []) as Record<string, CsvCell>[];
  const games = (gamesRes.data ?? []) as Record<string, CsvCell>[];
  const registrations = (registrationsRes.data ?? []) as Record<string, CsvCell>[];
  const audit = (auditRes.data ?? []) as Record<string, CsvCell>[];
  const bracketMatches = (bracketRes.data ?? []) as Record<string, CsvCell>[];

  const divisionsById = new Map(divisions.map((row) => [String(row.id), row]));
  const poolsById = new Map(pools.map((row) => [String(row.id), row]));
  const teamsById = new Map(teams.map((row) => [String(row.id), row]));
  const playersById = new Map(players.map((row) => [String(row.id), row]));
  const courtsById = new Map(courts.map((row) => [String(row.id), row]));
  const formatsById = new Map(formats.map((row) => [String(row.id), row]));
  const gamesByMatch = latestGameByMatch(games);
  const teamPlayerNames = new Map<string, { player1: string; player2: string; contact: string }>();

  for (const link of teamPlayers) {
    const teamId = String(link.team_id ?? "");
    const current = teamPlayerNames.get(teamId) ?? { player1: "", player2: "", contact: "" };
    const player = playersById.get(String(link.player_id));
    const name = fullName(player);
    if (link.role === "player_1") current.player1 = name;
    if (link.role === "player_2") current.player2 = name;
    if (!current.contact) current.contact = String(player?.email ?? player?.phone ?? "");
    teamPlayerNames.set(teamId, current);
  }

  const matchRows = matches.map((match, index) => {
    const division = divisionsById.get(String(match.division_id));
    const pool = match.pool_id ? poolsById.get(String(match.pool_id)) : undefined;
    const court = match.court_id ? courtsById.get(String(match.court_id)) : undefined;
    const team1 = match.team1_id ? teamsById.get(String(match.team1_id)) : undefined;
    const team2 = match.team2_id ? teamsById.get(String(match.team2_id)) : undefined;
    const game = gamesByMatch.get(String(match.id));
    const t1Score = game ? Number(game.team1_score ?? 0) : "";
    const t2Score = game ? Number(game.team2_score ?? 0) : "";
    const completed = game && t1Score !== t2Score;
    const team1Name = makeTeamName(team1);
    const team2Name = makeTeamName(team2);
    return {
      "Seq #": index + 1,
      "Match ID": String(match.human_match_id ?? ""),
      Day: "",
      Block: "",
      Start: compactDateTime(String(match.planned_start_time ?? "")),
      End: compactDateTime(String(match.actual_end_time ?? "")),
      Court: String(court?.name ?? match.court_id ?? ""),
      Division: String(division?.name ?? ""),
      Pool: String(pool?.name ?? ""),
      Stage: String(match.match_type ?? ""),
      "Team 1": team1Name,
      "Team 2": team2Name,
      "Team 1 Score": t1Score,
      "Team 2 Score": t2Score,
      "Completed?": completed ? "Yes" : "",
      Winner: completed ? (Number(t1Score) > Number(t2Score) ? team1Name : team2Name) : "",
      Loser: completed ? (Number(t1Score) > Number(t2Score) ? team2Name : team1Name) : "",
      "Team 1 Win": completed ? Number(Number(t1Score) > Number(t2Score)) : "",
      "Team 2 Win": completed ? Number(Number(t2Score) > Number(t1Score)) : "",
      "Team 1 Point Diff": completed ? Number(t1Score) - Number(t2Score) : "",
      "Team 2 Point Diff": completed ? Number(t2Score) - Number(t1Score) : "",
      Status: String(match.status ?? ""),
      Match: String(match.human_match_id ?? "")
    };
  });

  if (kind === "teams") {
    return {
      filename: definition.filename,
      csv: toCsv(teamHeaders, teams.map((team, index) => {
        const division = divisionsById.get(String(team.division_id));
        const poolTeam = pools.find((pool) => team.id && String(pool.id) === String(team.pool_id));
        const playerNames = teamPlayerNames.get(String(team.id)) ?? { player1: "", player2: "", contact: "" };
        return {
          "Skill Group": String(division?.name ?? ""),
          Prefix: prefixFor(String(division?.name ?? "")),
          Pool: String(poolTeam?.name ?? ""),
          "Team #": index + 1,
          "Team ID": String(team.team_name ?? ""),
          "Player 1": playerNames.player1,
          "Player 2": playerNames.player2,
          Status: String(team.status ?? ""),
          "Payment Status": String(team.payment_status ?? ""),
          Seed: team.seed
        };
      }))
    };
  }

  if (kind === "score-entry") return { filename: definition.filename, csv: toCsv(scoreEntryHeaders, matchRows) };
  if (kind === "schedule") return { filename: definition.filename, csv: toCsv(scheduleHeaders, matchRows) };

  if (kind === "scoresheet-data") {
    return {
      filename: definition.filename,
      csv: toCsv(scoresheetHeaders, matches.map((match) => {
        const division = divisionsById.get(String(match.division_id));
        const court = match.court_id ? courtsById.get(String(match.court_id)) : undefined;
        const team1 = match.team1_id ? teamsById.get(String(match.team1_id)) : undefined;
        const team2 = match.team2_id ? teamsById.get(String(match.team2_id)) : undefined;
        const p1 = teamPlayerNames.get(String(team1?.id)) ?? { player1: "", player2: "", contact: "" };
        const p2 = teamPlayerNames.get(String(team2?.id)) ?? { player1: "", player2: "", contact: "" };
        return {
          "Print?": "",
          Event: String(division?.name ?? ""),
          Time: compactDateTime(String(match.planned_start_time ?? "")),
          Match: String(match.human_match_id ?? ""),
          Court: String(court?.name ?? match.court_id ?? ""),
          Referee: "",
          Format: scoreFormat(match.match_format_id ? formatsById.get(String(match.match_format_id)) : undefined),
          TID1: makeTeamName(team1),
          T1P1: p1.player1,
          T1P2: p1.player2,
          TID2: makeTeamName(team2),
          T2P1: p2.player1,
          T2P2: p2.player2
        };
      }))
    };
  }

  const standings = standingsFromMatches(matches, divisionsById, poolsById, teamsById, gamesByMatch);
  if (kind === "standings") return { filename: definition.filename, csv: toCsv(standingsHeaders, standings) };
  if (kind === "rankings") {
    return {
      filename: definition.filename,
      csv: toCsv(rankingHeaders, standings.filter((row) => row["Rank in Pool"]).map((row) => ({
        "Skill Group": row["Skill Group"],
        Pool: row.Pool,
        Rank: row["Rank in Pool"],
        Team: row.Team,
        "Matches Played": row["Matches Played"],
        Wins: row.Wins,
        Losses: row.Losses,
        "Win %": row["Win %"],
        "Point Differential": row["Point Differential"],
        "Head-to-Head Wins": row["Head-to-Head Wins vs Tied Teams"]
      })))
    };
  }

  if (kind === "bracket") {
    return {
      filename: definition.filename,
      csv: toCsv(bracketHeaders, bracketMatches.map((row) => {
        const match = matches.find((item) => String(item.id) === String(row.match_id));
        const division = match ? divisionsById.get(String(match.division_id)) : undefined;
        const team1 = match?.team1_id ? teamsById.get(String(match.team1_id)) : undefined;
        const team2 = match?.team2_id ? teamsById.get(String(match.team2_id)) : undefined;
        return {
          Division: String(division?.name ?? ""),
          Prefix: prefixFor(String(division?.name ?? "")),
          "Match ID": String(match?.human_match_id ?? ""),
          Round: String(row.round_name ?? ""),
          Matchup: `${makeTeamName(team1) || "TBD"} vs ${makeTeamName(team2) || "TBD"}`,
          "Team 1 Source": makeTeamName(team1),
          "Team 2 Source": makeTeamName(team2),
          Duration: "",
          Notes: row.is_final ? "Final" : row.is_bronze_match ? "Bronze match" : ""
        };
      }))
    };
  }

  if (kind === "registrations") {
    return {
      filename: definition.filename,
      csv: toCsv(registrationHeaders, registrations.map((registration) => {
        const team = registration.team_id ? teamsById.get(String(registration.team_id)) : undefined;
        const division = registration.division_id ? divisionsById.get(String(registration.division_id)) : undefined;
        const playerNames = team ? teamPlayerNames.get(String(team.id)) : undefined;
        return {
          registrationId: registration.id,
          teamId: makeTeamName(team),
          division: String(division?.name ?? ""),
          player1: playerNames?.player1 ?? "",
          player2: playerNames?.player2 ?? "",
          contact: playerNames?.contact ?? "",
          status: registration.status,
          paymentStatus: team?.payment_status,
          paymentMethod: team?.payment_method,
          amountPaid: team?.amount_paid,
          source: registration.registration_type,
          partnerStatus: registration.needs_partner ? "needs partner" : "partnered",
          waiverAccepted: registration.waiver_acceptance_id ? "Yes" : ""
        };
      }))
    };
  }

  return {
    filename: definition.filename,
    csv: toCsv(auditHeaders, audit.map((row) => ({
      timestamp: row.created_at,
      actor: row.actor_user_id,
      action: row.action,
      detail: row.summary,
      auditId: row.id
    })))
  };
}
