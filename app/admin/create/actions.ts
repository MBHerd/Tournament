"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

const creatorRoles = new Set(["organization_owner", "tournament_director"]);

type SetupContext = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  appUser: { id: string; platform_role?: string | null };
};

function textValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(formData: FormData, name: string) {
  const value = textValue(formData, name);
  return value ? value : null;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function wholeNumber(formData: FormData, name: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(textValue(formData, name), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function moneyNumber(formData: FormData, name: string) {
  const parsed = Number.parseFloat(textValue(formData, name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function timestampOrNull(formData: FormData, name: string) {
  const value = textValue(formData, name);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function matchFormatPreset(value: string, customName: string) {
  switch (value) {
    case "1x15-sideout":
      return { name: "1 game to 15, win by 2, side-out", format_type: "single_game", target_points: 15, win_by: 2, best_of_games: 1, scoring_type: "side_out" };
    case "1x15-rally":
      return { name: "1 game to 15, win by 2, rally", format_type: "single_game", target_points: 15, win_by: 2, best_of_games: 1, scoring_type: "rally" };
    case "bo3-11":
      return { name: "Best 2 of 3 to 11", format_type: "best_of_three", target_points: 11, win_by: 2, best_of_games: 3, scoring_type: "side_out" };
    case "custom":
      return { name: customName || "Custom score format", format_type: "custom", target_points: 11, win_by: 2, best_of_games: 1, scoring_type: "side_out" };
    default:
      return { name: "1 game to 11, win by 2, side-out", format_type: "single_game", target_points: 11, win_by: 2, best_of_games: 1, scoring_type: "side_out" };
  }
}

function poolNames(count: number) {
  return Array.from({ length: count }, (_, index) => {
    let value = index;
    let label = "";
    do {
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return `Pool ${label}`;
  });
}

async function requireSetupContext(next = "/admin/create"): Promise<SetupContext> {
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
    .select("id, platform_role")
    .single();

  if (!appUser) redirect("/admin/create?error=Could%20not%20prepare%20your%20user%20profile.");
  return { admin, appUser };
}

async function ensureCreatorRole({ admin, appUser }: SetupContext, organizationId: string) {
  if (appUser.platform_role === "platform_admin") return;

  const { data: memberships } = await admin
    .from("organization_memberships")
    .select("role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", appUser.id)
    .eq("status", "active");

  if (!memberships?.some((membership) => creatorRoles.has(String(membership.role)))) {
    redirect("/admin/create?error=Only%20organization%20owners%20and%20tournament%20directors%20can%20create%20tournaments.");
  }
}

async function ensureMatchFormat(context: SetupContext, organizationId: string, preset: ReturnType<typeof matchFormatPreset>, schedulingMode: string, minutes: number, bufferMinutes: number) {
  const { admin } = context;
  const { data: existing } = await admin
    .from("match_formats")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", preset.name)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data, error } = await admin
    .from("match_formats")
    .insert({
      organization_id: organizationId,
      name: preset.name,
      format_type: preset.format_type,
      target_points: preset.target_points,
      win_by: preset.win_by,
      best_of_games: preset.best_of_games,
      scoring_type: preset.scoring_type,
      custom_rules_json: {
        scheduling_mode: schedulingMode,
        planned_minutes: minutes,
        buffer_minutes: bufferMinutes
      }
    })
    .select("id")
    .single();

  if (error || !data?.id) throw new Error("Could not save the match format.");
  return String(data.id);
}

export async function createTournamentFromDirectorSetup(formData: FormData) {
  const context = await requireSetupContext();
  const { admin, appUser } = context;
  const organizationId = textValue(formData, "organizationId");
  await ensureCreatorRole(context, organizationId);

  const tournamentName = textValue(formData, "tournamentName");
  const venueName = textValue(formData, "venueName");
  const divisionName = textValue(formData, "divisionName");
  if (!organizationId || !tournamentName || !venueName || !divisionName) {
    redirect("/admin/create?error=Tournament%2C%20venue%2C%20and%20division%20names%20are%20required.");
  }

  const { data: organization } = await admin.from("organizations").select("id, slug").eq("id", organizationId).single();
  if (!organization?.id) redirect("/admin/create?error=Could%20not%20find%20that%20organization.");

  const plannedTeams = wholeNumber(formData, "plannedTeams", 16, 2, 256);
  const physicalCourts = wholeNumber(formData, "physicalCourts", 4, 1, 64);
  const virtualQueues = wholeNumber(formData, "virtualQueues", 1, 0, 12);
  const poolSize = wholeNumber(formData, "poolSize", 4, 2, 12);
  const teamsAdvance = wholeNumber(formData, "teamsAdvance", 2, 1, 8);
  const wildcardCount = wholeNumber(formData, "wildcardCount", 0, 0, 64);
  const poolMinutes = wholeNumber(formData, "poolMinutes", 20, 5, 180);
  const bracketMinutes = wholeNumber(formData, "bracketMinutes", 25, 5, 240);
  const bufferMinutes = wholeNumber(formData, "bufferMinutes", 5, 0, 60);
  const schedulingMode = textValue(formData, "schedulingMode") || "timed";
  const tournamentFormat = textValue(formData, "tournamentFormat") || "pool_to_single_elimination";
  const eventType = textValue(formData, "eventType") || "open_doubles";
  const bronzeEnabled = checked(formData, "bronzeMatchEnabled");
  const poolCount = Math.max(1, Math.ceil(plannedTeams / poolSize));
  const now = new Date().toISOString();

  try {
    const { data: venue, error: venueError } = await admin
      .from("venues")
      .insert({
        organization_id: organizationId,
        name: venueName,
        address: nullableText(formData, "venueAddress"),
        city: nullableText(formData, "venueCity"),
        region: nullableText(formData, "venueRegion"),
        country: textValue(formData, "venueCountry") || "Philippines",
        map_url: nullableText(formData, "venueMapUrl")
      })
      .select("id")
      .single();

    if (venueError || !venue?.id) throw new Error("Could not create the venue.");

    const setupSummary = [
      textValue(formData, "rulesSummary") || "Traditional doubles pool play into single-elimination bracket.",
      `Format: ${tournamentFormat.replaceAll("_", " ")}.`,
      `Planned teams: ${plannedTeams}; courts: ${physicalCourts}; pools: ${poolCount} of about ${poolSize}.`,
      `Scheduling: ${schedulingMode.replaceAll("_", " ")} with ${poolMinutes} minute pool matches, ${bracketMinutes} minute bracket matches, and ${bufferMinutes} minute buffers.`,
      bronzeEnabled ? "Bronze match enabled." : "Bronze match disabled."
    ].join("\n");

    const { data: tournament, error: tournamentError } = await admin
      .from("tournaments")
      .insert({
        organization_id: organizationId,
        name: tournamentName,
        slug: slugify(textValue(formData, "tournamentSlug") || tournamentName),
        description: textValue(formData, "tournamentDescription"),
        start_date: nullableText(formData, "startDate"),
        end_date: nullableText(formData, "endDate"),
        timezone: textValue(formData, "timezone") || "Asia/Manila",
        status: textValue(formData, "status") || "draft",
        venue_id: venue.id,
        registration_opens_at: timestampOrNull(formData, "registrationOpensAt"),
        registration_closes_at: timestampOrNull(formData, "registrationClosesAt"),
        registration_close_enabled: checked(formData, "registrationCloseEnabled"),
        public_page_enabled: checked(formData, "publicPageEnabled"),
        public_results_enabled: checked(formData, "publicResultsEnabled"),
        waiver_text: textValue(formData, "waiverText"),
        age_method: textValue(formData, "ageMethod") || "age_on_tournament_date",
        rules_summary: setupSummary,
        contact_email: nullableText(formData, "contactEmail"),
        contact_phone: nullableText(formData, "contactPhone"),
        map_url: nullableText(formData, "venueMapUrl"),
        created_by_user_id: appUser.id,
        updated_at: now
      })
      .select("id, slug")
      .single();

    if (tournamentError || !tournament?.id) throw new Error("Could not create the tournament. Check for duplicate slugs.");

    const poolFormatId = await ensureMatchFormat(context, organizationId, matchFormatPreset(textValue(formData, "poolMatchFormat"), textValue(formData, "customPoolFormat")), schedulingMode, poolMinutes, bufferMinutes);
    const bracketFormatId = await ensureMatchFormat(context, organizationId, matchFormatPreset(textValue(formData, "bracketMatchFormat"), textValue(formData, "customBracketFormat")), schedulingMode, bracketMinutes, bufferMinutes);

    const courtRows = [
      ...Array.from({ length: physicalCourts }, (_, index) => ({
        tournament_id: tournament.id,
        venue_id: venue.id,
        name: `${textValue(formData, "courtPrefix") || "Court"} ${index + 1}`,
        court_number: index + 1,
        court_type: "physical",
        sort_order: index + 1
      })),
      ...Array.from({ length: virtualQueues }, (_, index) => ({
        tournament_id: tournament.id,
        venue_id: venue.id,
        name: virtualQueues === 1 ? "Next Available Queue" : `Queue ${index + 1}`,
        court_number: null,
        court_type: "virtual_queue",
        sort_order: physicalCourts + index + 1
      }))
    ];

    const { data: courts, error: courtsError } = await admin.from("courts").insert(courtRows).select("id, court_type");
    if (courtsError || !courts?.length) throw new Error("Could not create courts.");

    const breakStart = timestampOrNull(formData, "breakStart");
    const breakEnd = timestampOrNull(formData, "breakEnd");
    if (breakStart && breakEnd) {
      const breakRows = courts
        .filter((court) => court.court_type === "physical")
        .map((court) => ({
          court_id: court.id,
          start_time: breakStart,
          end_time: breakEnd,
          status: "break",
          reason: textValue(formData, "breakReason") || "Tournament break"
        }));
      if (breakRows.length) await admin.from("court_availability_blocks").insert(breakRows);
    }

    const { data: division, error: divisionError } = await admin
      .from("divisions")
      .insert({
        tournament_id: tournament.id,
        name: divisionName,
        event_type: eventType,
        skill_label: nullableText(formData, "skillLabel"),
        numeric_skill: nullableText(formData, "numericSkill"),
        age_group: textValue(formData, "ageGroup") || "open",
        is_junior: checked(formData, "isJunior"),
        custom_name: nullableText(formData, "customDivisionName"),
        capacity_limit: plannedTeams,
        waitlist_enabled: checked(formData, "waitlistEnabled"),
        registration_fee: moneyNumber(formData, "registrationFee"),
        pool_size_setting: poolSize,
        auto_balance_pools: checked(formData, "autoBalancePools"),
        advancement_type: textValue(formData, "advancementType") || "top_per_pool",
        teams_advance_per_pool: teamsAdvance,
        wildcard_count: wildcardCount,
        bronze_match_enabled: bronzeEnabled,
        pool_match_format_id: poolFormatId,
        bracket_match_format_id: bracketFormatId,
        time_block_start: timestampOrNull(formData, "divisionStart"),
        time_block_end: timestampOrNull(formData, "divisionEnd"),
        status: textValue(formData, "divisionStatus") || "draft"
      })
      .select("id")
      .single();

    if (divisionError || !division?.id) throw new Error("Could not create the division.");

    await admin.from("pools").insert(poolNames(poolCount).map((name, index) => ({ division_id: division.id, name, sort_order: index + 1 })));
    await admin.from("brackets").insert({
      division_id: division.id,
      name: `${divisionName} Bracket`,
      bracket_type: "single_elimination",
      status: "draft",
      bronze_match_enabled: bronzeEnabled
    });
    await admin.from("public_display_settings").insert({
      tournament_id: tournament.id,
      show_current_matches: true,
      show_upcoming_matches: true,
      show_recent_results: true,
      show_court_assignments: true,
      show_pool_standings: true,
      show_bracket: true,
      show_announcements: true,
      show_sponsor_slides: checked(formData, "showSponsors"),
      show_medalists: true,
      show_qr_code: true
    });

    await admin.from("audit_logs").insert({
      organization_id: organizationId,
      tournament_id: tournament.id,
      actor_user_id: appUser.id,
      action_type: "tournament_created_from_director_setup",
      entity_type: "tournament",
      entity_id: tournament.id,
      after_json: {
        tournament_slug: tournament.slug,
        planned_teams: plannedTeams,
        physical_courts: physicalCourts,
        virtual_queues: virtualQueues,
        tournament_format: tournamentFormat,
        scheduling_mode: schedulingMode,
        pool_count: poolCount,
        pool_size: poolSize,
        teams_advance_per_pool: teamsAdvance,
        wildcard_count: wildcardCount,
        bronze_match_enabled: bronzeEnabled
      },
      reason: "Created from the tournament director setup GUI."
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/create");
    revalidatePath(`/org/${organization.slug}`);
    revalidatePath(`/t/${tournament.slug}`);

    redirect(`/admin/create?created=${encodeURIComponent(tournament.slug)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tournament setup failed.";
    redirect(`/admin/create?error=${encodeURIComponent(message)}`);
  }
}
