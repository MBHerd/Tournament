"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getPrimarySnapshot } from "@/src/lib/tournament-data";

type CsvRow = Record<string, string>;

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

function slugKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function splitName(name: string) {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "Unknown", last_name: "Player" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "Player" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts.at(-1) ?? "Player" };
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell.trim());
  rows.push(row);

  const headers = (rows.shift() ?? []).map((header) => header.trim());
  return rows
    .filter((items) => items.some(Boolean))
    .map((items) => Object.fromEntries(headers.map((header, index) => [header, clean(items[index])])));
}

function pick(row: CsvRow, ...headers: string[]) {
  const entries = Object.entries(row);
  for (const header of headers) {
    const exact = row[header];
    if (exact) return exact;
    const found = entries.find(([key]) => key.toLowerCase() === header.toLowerCase());
    if (found?.[1]) return found[1];
  }
  return "";
}

function safeTeamStatus(value: string) {
  return ["pending", "confirmed", "waitlisted", "withdrawn", "disqualified"].includes(value) ? value : "confirmed";
}

function safePaymentStatus(value: string) {
  return ["unpaid", "partial", "paid", "refunded", "waived"].includes(value) ? value : "unpaid";
}

function matchType(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("final")) return "final";
  if (lower.includes("bronze") || lower.includes("third")) return "bronze";
  if (lower.includes("bracket") || lower.includes("quarter") || lower.includes("semi")) return "bracket";
  return "pool";
}

function dateTimeOrNull(value: string) {
  if (!value || /^\d+(\.\d+)?$/.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function requireContext(next = "/admin/operations") {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);

  const admin = createSupabaseAdminClient();
  const email = user.email ?? `${user.id}@supabase.local`;
  const { data: appUser } = await admin
    .from("users")
    .upsert(
      {
        supabase_auth_user_id: user.id,
        auth_provider_id: user.id,
        email,
        name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? email,
        updated_at: new Date().toISOString()
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();

  const snapshot = await getPrimarySnapshot();
  if (snapshot.source !== "supabase" || !appUser) redirect("/admin/operations?error=Live%20Supabase%20data%20is%20required.");

  return { admin, appUser, snapshot };
}

async function audit(admin: ReturnType<typeof createSupabaseAdminClient>, organizationId: string, tournamentId: string, actorUserId: string, actionType: string, reason: string, afterJson: Record<string, unknown>) {
  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    tournament_id: tournamentId,
    actor_user_id: actorUserId,
    action_type: actionType,
    entity_type: "tournament",
    entity_id: tournamentId,
    after_json: afterJson,
    reason
  });
}

async function ensureDivision(admin: ReturnType<typeof createSupabaseAdminClient>, tournamentId: string, name: string) {
  const divisionName = name || "Open Doubles";
  const existing = await admin.from("divisions").select("id").eq("tournament_id", tournamentId).eq("name", divisionName).maybeSingle();
  if (existing.data?.id) return String(existing.data.id);

  const inserted = await admin
    .from("divisions")
    .insert({
      tournament_id: tournamentId,
      name: divisionName,
      event_type: "open_doubles",
      age_group: "open",
      status: "registration_open"
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) throw new Error(`Could not create division ${divisionName}.`);
  return String(inserted.data.id);
}

async function ensurePool(admin: ReturnType<typeof createSupabaseAdminClient>, divisionId: string, name: string) {
  if (!name) return null;
  const existing = await admin.from("pools").select("id").eq("division_id", divisionId).eq("name", name).maybeSingle();
  if (existing.data?.id) return String(existing.data.id);
  const inserted = await admin.from("pools").insert({ division_id: divisionId, name }).select("id").single();
  if (inserted.error || !inserted.data) throw new Error(`Could not create pool ${name}.`);
  return String(inserted.data.id);
}

async function ensureCourt(admin: ReturnType<typeof createSupabaseAdminClient>, tournamentId: string, venueId: string | null, name: string) {
  if (!name || !venueId) return null;
  const existing = await admin.from("courts").select("id").eq("tournament_id", tournamentId).eq("name", name).maybeSingle();
  if (existing.data?.id) return String(existing.data.id);
  const number = Number(name.replace(/\D/g, "")) || null;
  const inserted = await admin.from("courts").insert({ tournament_id: tournamentId, venue_id: venueId, name, court_number: number, sort_order: number ?? 0 }).select("id").single();
  if (inserted.error || !inserted.data) throw new Error(`Could not create court ${name}.`);
  return String(inserted.data.id);
}

async function ensureTeam(admin: ReturnType<typeof createSupabaseAdminClient>, tournamentId: string, divisionId: string, name: string, status = "confirmed", paymentStatus = "unpaid", seed?: number) {
  const teamName = name || `Team ${crypto.randomUUID().slice(0, 8)}`;
  const existing = await admin.from("teams").select("id").eq("tournament_id", tournamentId).eq("team_name", teamName).maybeSingle();
  const payload = {
    tournament_id: tournamentId,
    division_id: divisionId,
    team_name: teamName,
    status: safeTeamStatus(status),
    payment_status: safePaymentStatus(paymentStatus),
    seed: Number.isFinite(seed) ? seed : null,
    updated_at: new Date().toISOString()
  };
  if (existing.data?.id) {
    await admin.from("teams").update(payload).eq("id", existing.data.id);
    return String(existing.data.id);
  }
  const inserted = await admin.from("teams").insert(payload).select("id").single();
  if (inserted.error || !inserted.data) throw new Error(`Could not create team ${teamName}.`);
  return String(inserted.data.id);
}

async function ensurePlayer(admin: ReturnType<typeof createSupabaseAdminClient>, name: string) {
  const names = splitName(name);
  const duplicateKey = slugKey(`${names.first_name}-${names.last_name}`);
  const existing = await admin.from("players").select("id").eq("duplicate_warning_key", duplicateKey).maybeSingle();
  if (existing.data?.id) return String(existing.data.id);
  const inserted = await admin.from("players").insert({ ...names, duplicate_warning_key: duplicateKey }).select("id").single();
  if (inserted.error || !inserted.data) throw new Error(`Could not create player ${name}.`);
  return String(inserted.data.id);
}

async function setTeamPlayers(admin: ReturnType<typeof createSupabaseAdminClient>, teamId: string, player1: string, player2: string) {
  await admin.from("team_players").delete().eq("team_id", teamId).in("role", ["player_1", "player_2"]);
  const links = [];
  if (player1) links.push({ team_id: teamId, player_id: await ensurePlayer(admin, player1), role: "player_1", partner_confirmed: Boolean(player2) });
  if (player2) links.push({ team_id: teamId, player_id: await ensurePlayer(admin, player2), role: "player_2", partner_confirmed: true });
  if (links.length) await admin.from("team_players").insert(links);
}

async function saveOfficialScore(admin: ReturnType<typeof createSupabaseAdminClient>, matchId: string, appUserId: string, team1Id: string, team2Id: string, team1Score: number, team2Score: number) {
  const winnerId = team1Score > team2Score ? team1Id : team2Id;
  const loserId = team1Score > team2Score ? team2Id : team1Id;
  await admin.from("matches").update({ status: "official_final", winner_team_id: winnerId, loser_team_id: loserId, updated_at: new Date().toISOString() }).eq("id", matchId);
  const result = await admin
    .from("official_match_results")
    .upsert(
      {
        match_id: matchId,
        approved_by_user_id: appUserId,
        winner_team_id: winnerId,
        loser_team_id: loserId,
        result_type: "normal",
        updated_at: new Date().toISOString()
      },
      { onConflict: "match_id" }
    )
    .select("id")
    .single();
  if (!result.data?.id) throw new Error("Could not save official result.");
  await admin.from("match_games").delete().eq("official_result_id", result.data.id);
  await admin.from("match_games").insert({
    match_id: matchId,
    official_result_id: result.data.id,
    game_number: 1,
    team1_score: team1Score,
    team2_score: team2Score,
    winner_team_id: winnerId
  });
}

export async function importSpreadsheetRows(formData: FormData) {
  const importKind = textValue(formData, "importKind");
  const rows = parseCsv(textValue(formData, "csvText"));
  if (!rows.length) redirect("/admin/operations?error=Paste%20CSV%20rows%20before%20importing.");

  const { admin, appUser, snapshot } = await requireContext();
  const tournamentId = snapshot.tournament.id;
  let count = 0;

  try {
    if (importKind === "teams") {
      for (const row of rows) {
        const divisionId = await ensureDivision(admin, tournamentId, pick(row, "Skill Group", "Division"));
        const poolId = await ensurePool(admin, divisionId, pick(row, "Pool"));
        const seed = Number(pick(row, "Seed", "Team #")) || undefined;
        const teamId = await ensureTeam(admin, tournamentId, divisionId, pick(row, "Team ID", "Team", "teamId"), pick(row, "Status"), pick(row, "Payment Status", "paymentStatus"), seed);
        if (poolId) {
          await admin.from("pool_teams").upsert({ pool_id: poolId, team_id: teamId, seed: seed ?? null }, { onConflict: "pool_id,team_id" });
        }
        await setTeamPlayers(admin, teamId, pick(row, "Player 1", "player1", "T1P1"), pick(row, "Player 2", "player2", "T1P2"));
        count += 1;
      }
    } else {
      for (const row of rows) {
        const humanMatchId = pick(row, "Match ID", "Match");
        if (!humanMatchId) continue;
        const divisionId = await ensureDivision(admin, tournamentId, pick(row, "Division", "Event", "Skill Group"));
        const poolId = await ensurePool(admin, divisionId, pick(row, "Pool"));
        const courtId = await ensureCourt(admin, tournamentId, snapshot.tournament.venue_id, pick(row, "Court"));
        const team1Id = await ensureTeam(admin, tournamentId, divisionId, pick(row, "Team 1", "TID1"), "confirmed", "unpaid");
        const team2Id = await ensureTeam(admin, tournamentId, divisionId, pick(row, "Team 2", "TID2"), "confirmed", "unpaid");
        const payload = {
          tournament_id: tournamentId,
          division_id: divisionId,
          pool_id: poolId,
          human_match_id: humanMatchId,
          match_type: matchType(pick(row, "Stage", "Round")),
          team1_id: team1Id,
          team2_id: team2Id,
          court_id: courtId,
          planned_start_time: dateTimeOrNull(pick(row, "Start", "Time")),
          status: pick(row, "Status") || "scheduled",
          updated_at: new Date().toISOString()
        };
        const match = await admin.from("matches").upsert(payload, { onConflict: "tournament_id,human_match_id" }).select("id").single();
        if (!match.data?.id) continue;
        const score1 = Number(pick(row, "Team 1 Score"));
        const score2 = Number(pick(row, "Team 2 Score"));
        if (Number.isInteger(score1) && Number.isInteger(score2) && score1 !== score2) {
          await saveOfficialScore(admin, String(match.data.id), appUser.id, team1Id, team2Id, score1, score2);
        }
        count += 1;
      }
    }

    await audit(admin, snapshot.organization.id, tournamentId, appUser.id, `spreadsheet_${importKind}_imported`, `Imported ${count} ${importKind} rows from spreadsheet paste.`, { importKind, rows: count });
    revalidatePath("/admin/operations");
    revalidatePath("/admin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    redirect(`/admin/operations?error=${encodeURIComponent(message)}`);
  }

  redirect(`/admin/operations?imported=${count}`);
}

export async function saveMatchScore(formData: FormData) {
  const { admin, appUser, snapshot } = await requireContext();

  try {
    const matchId = textValue(formData, "matchId");
    const team1Score = Number(textValue(formData, "team1Score"));
    const team2Score = Number(textValue(formData, "team2Score"));
    if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score) || team1Score < 0 || team2Score < 0) throw new Error("Scores must be whole numbers.");
    if (team1Score === team2Score) throw new Error("A tied final score cannot be official.");

    const match = await admin.from("matches").select("id, human_match_id, team1_id, team2_id").eq("id", matchId).single();
    if (!match.data?.team1_id || !match.data?.team2_id) throw new Error("This match needs both teams before a score can be saved.");

    await saveOfficialScore(admin, matchId, appUser.id, String(match.data.team1_id), String(match.data.team2_id), team1Score, team2Score);
    await audit(admin, snapshot.organization.id, snapshot.tournament.id, appUser.id, "score_saved_from_operations", `Saved official score for ${match.data.human_match_id}.`, { matchId, team1Score, team2Score });
    revalidatePath("/admin/operations");
    revalidatePath("/");
    revalidatePath(`/t/${snapshot.tournament.slug}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Score could not be saved.";
    redirect(`/admin/operations?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/operations?savedScore=1");
}
