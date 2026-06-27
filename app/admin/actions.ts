"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function requireSignedInUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");
  return user;
}

export async function saveTournamentProfile(formData: FormData) {
  const authUser = await requireSignedInUser();
  const admin = createSupabaseAdminClient();

  const organizationName = textValue(formData, "organizationName");
  const tournamentName = textValue(formData, "tournamentName");
  const venueName = textValue(formData, "venueName");

  if (!organizationName || !tournamentName || !venueName) {
    redirect("/admin?error=Organization%2C%20tournament%2C%20and%20venue%20names%20are%20required.");
  }

  const email = authUser.email ?? `${authUser.id}@supabase.local`;
  const displayName =
    (typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name) ||
    (typeof authUser.user_metadata?.full_name === "string" && authUser.user_metadata.full_name) ||
    email;

  const { data: appUser, error: userError } = await admin
    .from("users")
    .upsert(
      {
        supabase_auth_user_id: authUser.id,
        auth_provider_id: authUser.id,
        email,
        name: displayName,
        updated_at: new Date().toISOString()
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();

  if (userError || !appUser) redirect("/admin?error=Could%20not%20prepare%20your%20user%20profile.");

  const organizationId = textValue(formData, "organizationId");
  const organizationSlug = slugify(textValue(formData, "organizationSlug") || organizationName);
  const organizationPayload = {
    name: organizationName,
    slug: organizationSlug,
    description: textValue(formData, "organizationDescription"),
    contact_email: nullableText(formData, "organizationEmail"),
    contact_phone: nullableText(formData, "organizationPhone"),
    public_profile_enabled: checked(formData, "organizationPublic"),
    updated_at: new Date().toISOString()
  };

  const organizationResult = organizationId
    ? await admin.from("organizations").update(organizationPayload).eq("id", organizationId).select("id, slug").single()
    : await admin.from("organizations").insert(organizationPayload).select("id, slug").single();

  if (organizationResult.error || !organizationResult.data) {
    redirect("/admin?error=Could%20not%20save%20the%20organization.%20Check%20for%20duplicate%20slugs.");
  }

  const savedOrganizationId = organizationResult.data.id as string;

  await admin.from("organization_memberships").upsert(
    {
      organization_id: savedOrganizationId,
      user_id: appUser.id,
      role: "organization_owner",
      status: "active",
      accepted_at: new Date().toISOString()
    },
    { onConflict: "organization_id,user_id,role" }
  );

  const venueId = textValue(formData, "venueId");
  const venuePayload = {
    organization_id: savedOrganizationId,
    name: venueName,
    address: nullableText(formData, "venueAddress"),
    city: nullableText(formData, "venueCity"),
    region: nullableText(formData, "venueRegion"),
    country: textValue(formData, "venueCountry") || "Philippines",
    map_url: nullableText(formData, "venueMapUrl"),
    updated_at: new Date().toISOString()
  };

  const venueResult = venueId
    ? await admin.from("venues").update(venuePayload).eq("id", venueId).select("id").single()
    : await admin.from("venues").insert(venuePayload).select("id").single();

  if (venueResult.error || !venueResult.data) redirect("/admin?error=Could%20not%20save%20the%20venue.");

  const tournamentId = textValue(formData, "tournamentId");
  const tournamentSlug = slugify(textValue(formData, "tournamentSlug") || tournamentName);
  const tournamentPayload = {
    organization_id: savedOrganizationId,
    name: tournamentName,
    slug: tournamentSlug,
    description: textValue(formData, "tournamentDescription"),
    start_date: nullableText(formData, "startDate"),
    end_date: nullableText(formData, "endDate"),
    timezone: textValue(formData, "timezone") || "Asia/Manila",
    status: textValue(formData, "status") || "draft",
    venue_id: venueResult.data.id,
    public_page_enabled: checked(formData, "publicPageEnabled"),
    public_results_enabled: checked(formData, "publicResultsEnabled"),
    rules_summary: nullableText(formData, "rulesSummary"),
    contact_email: nullableText(formData, "tournamentEmail"),
    contact_phone: nullableText(formData, "tournamentPhone"),
    map_url: nullableText(formData, "tournamentMapUrl"),
    updated_at: new Date().toISOString()
  };

  const tournamentResult = tournamentId
    ? await admin.from("tournaments").update(tournamentPayload).eq("id", tournamentId).select("id, slug").single()
    : await admin
        .from("tournaments")
        .insert({ ...tournamentPayload, created_by_user_id: appUser.id })
        .select("id, slug")
        .single();

  if (tournamentResult.error || !tournamentResult.data) {
    redirect("/admin?error=Could%20not%20save%20the%20tournament.%20Check%20for%20duplicate%20slugs.");
  }

  await admin.from("public_display_settings").upsert(
    {
      tournament_id: tournamentResult.data.id,
      show_current_matches: true,
      show_upcoming_matches: true,
      show_recent_results: true,
      show_court_assignments: true,
      show_pool_standings: true,
      show_bracket: true,
      show_announcements: true,
      show_medalists: true,
      show_qr_code: true
    },
    { onConflict: "tournament_id" }
  );

  await admin.from("audit_logs").insert({
    organization_id: savedOrganizationId,
    tournament_id: tournamentResult.data.id,
    actor_user_id: appUser.id,
    action_type: tournamentId ? "tournament_profile_updated" : "tournament_profile_created",
    entity_type: "tournament",
    entity_id: tournamentResult.data.id,
    after_json: {
      organization_slug: organizationResult.data.slug,
      tournament_slug: tournamentResult.data.slug
    },
    reason: "Saved from the admin GUI."
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/org/${organizationResult.data.slug}`);
  revalidatePath(`/t/${tournamentResult.data.slug}`);

  redirect(`/admin?saved=1&tournament=${tournamentResult.data.slug}`);
}
