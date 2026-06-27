import { miniTournamentDemo } from "@/src/domain/demo/mini-tournament.mjs";
import { isSupabaseConfigured } from "@/src/lib/env";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  contact_email: string | null;
  contact_phone: string | null;
  public_profile_enabled: boolean;
};

export type VenueRecord = {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  map_url: string | null;
};

export type TournamentRecord = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  status: string;
  venue_id: string | null;
  public_page_enabled: boolean;
  public_results_enabled: boolean;
  rules_summary: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  map_url: string | null;
};

export type AppSnapshot = {
  source: "supabase" | "demo";
  organization: OrganizationRecord;
  tournament: TournamentRecord;
  venue: VenueRecord | null;
  counts: {
    organizations: number;
    tournaments: number;
    users: number;
    courts: number;
    teams: number;
    matches: number;
    auditEvents: number;
  };
};

function demoSnapshot(): AppSnapshot {
  const demo = miniTournamentDemo();

  return {
    source: "demo",
    organization: {
      id: demo.organization.organizationId,
      name: demo.organization.name,
      slug: demo.organization.slug,
      description: "Community pickleball organization in Gingoog City.",
      contact_email: "owner@example.com",
      contact_phone: null,
      public_profile_enabled: true
    },
    tournament: {
      id: demo.tournament.tournamentId,
      organization_id: demo.organization.organizationId,
      name: demo.tournament.name,
      slug: demo.tournament.slug,
      description: "Seeded mini tournament for foundation demos.",
      start_date: "2026-07-18",
      end_date: "2026-07-19",
      timezone: "Asia/Manila",
      status: "in_progress",
      venue_id: demo.venue.venueId,
      public_page_enabled: true,
      public_results_enabled: true,
      rules_summary: "Traditional doubles pool play into single-elimination bracket with bronze match.",
      contact_email: "td@example.com",
      contact_phone: "+63 900 000 0000",
      map_url: null
    },
    venue: {
      id: demo.venue.venueId,
      organization_id: demo.organization.organizationId,
      name: demo.venue.name,
      address: "City Sports Complex",
      city: "Gingoog",
      region: "Misamis Oriental",
      country: "Philippines",
      map_url: null
    },
    counts: {
      organizations: 1,
      tournaments: 1,
      users: demo.users.length,
      courts: demo.courts.length,
      teams: demo.teams.length,
      matches: demo.matches.length,
      auditEvents: demo.auditLog.length
    }
  };
}

async function countRows(table: string, filters?: Record<string, string>) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  for (const [column, value] of Object.entries(filters ?? {})) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function getPrimarySnapshot(): Promise<AppSnapshot> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return demoSnapshot();

  try {
    const supabase = createSupabaseAdminClient();
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<TournamentRecord>();

    if (!tournament) return demoSnapshot();

    const [{ data: organization }, { data: venue }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", tournament.organization_id).maybeSingle<OrganizationRecord>(),
      tournament.venue_id
        ? supabase.from("venues").select("*").eq("id", tournament.venue_id).maybeSingle<VenueRecord>()
        : Promise.resolve({ data: null })
    ]);

    if (!organization) return demoSnapshot();

    const [organizations, tournaments, users, courts, teams, matches, auditEvents] = await Promise.all([
      countRows("organizations"),
      countRows("tournaments"),
      countRows("users"),
      countRows("courts", { tournament_id: tournament.id }),
      countRows("teams", { tournament_id: tournament.id }),
      countRows("matches", { tournament_id: tournament.id }),
      countRows("audit_logs", { organization_id: organization.id })
    ]);

    return {
      source: "supabase",
      organization,
      tournament,
      venue,
      counts: { organizations, tournaments, users, courts, teams, matches, auditEvents }
    };
  } catch {
    return demoSnapshot();
  }
}

export async function getOrganizationSnapshot(slug: string): Promise<AppSnapshot | null> {
  const fallback = demoSnapshot();
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return slug === fallback.organization.slug ? fallback : null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: organization } = await supabase
      .from("organizations")
      .select("*")
      .eq("slug", slug)
      .maybeSingle<OrganizationRecord>();

    if (!organization) return null;

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<TournamentRecord>();

    if (!tournament) {
      return {
        source: "supabase",
        organization,
        tournament: fallback.tournament,
        venue: null,
        counts: {
          organizations: 1,
          tournaments: 0,
          users: await countRows("organization_memberships", { organization_id: organization.id }),
          courts: 0,
          teams: 0,
          matches: 0,
          auditEvents: await countRows("audit_logs", { organization_id: organization.id })
        }
      };
    }

    const snapshot = await getPrimarySnapshot();
    return snapshot.organization.id === organization.id ? snapshot : { ...snapshot, organization, tournament };
  } catch {
    return slug === fallback.organization.slug ? fallback : null;
  }
}

export async function getPublicTournament(slug: string): Promise<AppSnapshot | null> {
  const fallback = demoSnapshot();
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return slug === fallback.tournament.slug ? fallback : null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .eq("public_page_enabled", true)
      .maybeSingle<TournamentRecord>();

    if (!tournament) return null;

    const [{ data: organization }, { data: venue }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", tournament.organization_id).maybeSingle<OrganizationRecord>(),
      tournament.venue_id
        ? supabase.from("venues").select("*").eq("id", tournament.venue_id).maybeSingle<VenueRecord>()
        : Promise.resolve({ data: null })
    ]);

    if (!organization) return null;

    const [courts, teams, matches] = await Promise.all([
      countRows("courts", { tournament_id: tournament.id }),
      countRows("teams", { tournament_id: tournament.id }),
      countRows("matches", { tournament_id: tournament.id })
    ]);

    return {
      source: "supabase",
      organization,
      tournament,
      venue,
      counts: {
        organizations: 1,
        tournaments: 1,
        users: 0,
        courts,
        teams,
        matches,
        auditEvents: 0
      }
    };
  } catch {
    return slug === fallback.tournament.slug ? fallback : null;
  }
}

export function formatDateRange(tournament: TournamentRecord) {
  if (!tournament.start_date && !tournament.end_date) return "Dates to be announced";
  if (tournament.start_date === tournament.end_date || !tournament.end_date) return tournament.start_date ?? "Dates to be announced";
  return `${tournament.start_date} to ${tournament.end_date}`;
}
