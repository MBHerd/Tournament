import Link from "next/link";
import { createTournamentFromDirectorSetup } from "@/app/admin/create/actions";
import { getPrimarySnapshot } from "@/src/lib/tournament-data";

export const dynamic = "force-dynamic";

type CreatePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreateTournamentPage({ searchParams }: CreatePageProps) {
  const params = await searchParams;
  const created = firstParam(params?.created);
  const error = firstParam(params?.error);
  const snapshot = await getPrimarySnapshot();
  const { organization } = snapshot;
  const createdUrl = created ? `/t/${created}` : null;

  return (
    <>
      <section className="hero compact">
        <h2>Create Tournament</h2>
        <p>Build the tournament, courts, format, division, pools, and public settings in one director setup.</p>
        <div className="badges">
          <span className={snapshot.source === "supabase" ? "badge green" : "badge amber"}>
            {snapshot.source === "supabase" ? "Live Supabase data" : "Demo fallback"}
          </span>
          <span className="badge blue">{organization.name}</span>
        </div>
      </section>

      {created && createdUrl ? (
        <div className="notice green">
          Tournament created. <Link href={createdUrl}>Open public page</Link> or <Link href="/admin/operations">go to operations</Link>.
        </div>
      ) : null}
      {error ? <div className="notice red">{error}</div> : null}
      {snapshot.source !== "supabase" ? <div className="notice amber">Sign in with Supabase connected before creating a live tournament.</div> : null}

      <form action={createTournamentFromDirectorSetup} className="setup-layout">
        <input type="hidden" name="organizationId" value={snapshot.source === "supabase" ? organization.id : ""} />

        <section className="panel setup-main">
          <div className="panel-header">
            <h2>Tournament</h2>
            <p>{organization.name}</p>
          </div>
          <div className="panel-body form-grid">
            <div className="form-section">
              <h3>Profile</h3>
              <div className="form-grid two-column">
                <label>Name<input name="tournamentName" placeholder="Gingoog Open 2026" required /></label>
                <label>Slug<input name="tournamentSlug" placeholder="gingoog-open-2026" required /></label>
                <label>Start date<input name="startDate" type="date" /></label>
                <label>End date<input name="endDate" type="date" /></label>
                <label>Timezone<input name="timezone" defaultValue="Asia/Manila" /></label>
                <label>Status<select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="registration_open">Registration open</option>
                  <option value="registration_closed">Registration closed</option>
                  <option value="in_progress">In progress</option>
                </select></label>
                <label>Contact email<input name="contactEmail" type="email" defaultValue={organization.contact_email ?? ""} /></label>
                <label>Contact phone<input name="contactPhone" defaultValue={organization.contact_phone ?? ""} /></label>
              </div>
              <label>Description<textarea name="tournamentDescription" rows={3} /></label>
              <label>Rules summary<textarea name="rulesSummary" rows={3} defaultValue="Traditional doubles pool play into a single-elimination bracket." /></label>
            </div>

            <div className="form-section">
              <h3>Registration</h3>
              <div className="form-grid two-column">
                <label>Opens<input name="registrationOpensAt" type="datetime-local" /></label>
                <label>Closes<input name="registrationClosesAt" type="datetime-local" /></label>
                <label>Age method<select name="ageMethod" defaultValue="age_on_tournament_date">
                  <option value="exact_birthdate">Exact birthdate</option>
                  <option value="age_on_tournament_date">Age on tournament date</option>
                  <option value="player_selected_age_bracket">Player-selected age bracket</option>
                </select></label>
                <label>Division fee<input name="registrationFee" type="number" min="0" step="0.01" defaultValue="0" /></label>
              </div>
              <label>Waiver text<textarea name="waiverText" rows={4} /></label>
              <div className="inline-checks">
                <label className="check-row"><input name="registrationCloseEnabled" type="checkbox" defaultChecked /> Use registration close date</label>
                <label className="check-row"><input name="waitlistEnabled" type="checkbox" defaultChecked /> Waitlist</label>
                <label className="check-row"><input name="publicPageEnabled" type="checkbox" defaultChecked /> Public page</label>
                <label className="check-row"><input name="publicResultsEnabled" type="checkbox" defaultChecked /> Public results</label>
              </div>
            </div>

            <div className="form-section">
              <h3>Venue and Courts</h3>
              <div className="form-grid two-column">
                <label>Venue name<input name="venueName" placeholder="City Sports Complex" required /></label>
                <label>Country<input name="venueCountry" defaultValue="Philippines" /></label>
                <label>City<input name="venueCity" /></label>
                <label>Region<input name="venueRegion" /></label>
                <label>Physical courts<input name="physicalCourts" type="number" min="1" max="64" defaultValue="4" /></label>
                <label>Virtual queues<input name="virtualQueues" type="number" min="0" max="12" defaultValue="1" /></label>
                <label>Court prefix<input name="courtPrefix" defaultValue="Court" /></label>
                <label>Map URL<input name="venueMapUrl" type="url" /></label>
              </div>
              <label>Address<input name="venueAddress" /></label>
              <div className="form-grid two-column">
                <label>Break starts<input name="breakStart" type="datetime-local" /></label>
                <label>Break ends<input name="breakEnd" type="datetime-local" /></label>
              </div>
              <label>Break reason<input name="breakReason" placeholder="Lunch break" /></label>
            </div>
          </div>
        </section>

        <aside className="setup-side">
          <section className="panel">
            <div className="panel-header">
              <h2>Format</h2>
              <p>Pool play into bracket is the MVP default.</p>
            </div>
            <div className="panel-body form-grid">
              <label>Tournament format<select name="tournamentFormat" defaultValue="pool_to_single_elimination">
                <option value="pool_to_single_elimination">Pool play to single elimination</option>
                <option value="round_robin_to_single_elimination">Round robin to single elimination</option>
                <option value="single_elimination_only">Single elimination only</option>
              </select></label>
              <label>Scheduling mode<select name="schedulingMode" defaultValue="timed">
                <option value="timed">Timed schedule</option>
                <option value="queue">Queue schedule</option>
                <option value="next_available_court">Next available court</option>
              </select></label>
              <div className="form-grid two-column compact-fields">
                <label>Pool minutes<input name="poolMinutes" type="number" min="5" max="180" defaultValue="20" /></label>
                <label>Bracket minutes<input name="bracketMinutes" type="number" min="5" max="240" defaultValue="25" /></label>
                <label>Buffer minutes<input name="bufferMinutes" type="number" min="0" max="60" defaultValue="5" /></label>
                <label>Teams<input name="plannedTeams" type="number" min="2" max="256" defaultValue="16" /></label>
              </div>
              <label>Pool match format<select name="poolMatchFormat" defaultValue="1x11-sideout">
                <option value="1x11-sideout">1 game to 11, win by 2, side-out</option>
                <option value="1x15-sideout">1 game to 15, win by 2, side-out</option>
                <option value="1x15-rally">1 game to 15, win by 2, rally</option>
                <option value="bo3-11">Best 2 of 3 to 11</option>
                <option value="custom">Custom</option>
              </select></label>
              <label>Custom pool format<input name="customPoolFormat" /></label>
              <label>Bracket match format<select name="bracketMatchFormat" defaultValue="bo3-11">
                <option value="1x11-sideout">1 game to 11, win by 2, side-out</option>
                <option value="1x15-sideout">1 game to 15, win by 2, side-out</option>
                <option value="1x15-rally">1 game to 15, win by 2, rally</option>
                <option value="bo3-11">Best 2 of 3 to 11</option>
                <option value="custom">Custom</option>
              </select></label>
              <label>Custom bracket format<input name="customBracketFormat" /></label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Division</h2>
              <p>Starter event for registration, pools, and bracket seeding.</p>
            </div>
            <div className="panel-body form-grid">
              <label>Division name<input name="divisionName" defaultValue="Open Doubles" required /></label>
              <label>Custom division name<input name="customDivisionName" /></label>
              <label>Event type<select name="eventType" defaultValue="open_doubles">
                <option value="mens_doubles">Men's doubles</option>
                <option value="womens_doubles">Women's doubles</option>
                <option value="mixed_doubles">Mixed doubles</option>
                <option value="open_doubles">Open doubles</option>
              </select></label>
              <div className="form-grid two-column compact-fields">
                <label>Skill label<select name="skillLabel" defaultValue="intermediate">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="open">Open</option>
                </select></label>
                <label>Numeric skill<select name="numericSkill" defaultValue="3.5">
                  <option value="2.5">2.5</option>
                  <option value="3.0">3.0</option>
                  <option value="3.5">3.5</option>
                  <option value="4.0">4.0</option>
                  <option value="4.5">4.5</option>
                  <option value="open">Open</option>
                </select></label>
                <label>Age group<input name="ageGroup" defaultValue="open" /></label>
                <label>Pool size<input name="poolSize" type="number" min="2" max="12" defaultValue="4" /></label>
                <label>Advance per pool<input name="teamsAdvance" type="number" min="1" max="8" defaultValue="2" /></label>
                <label>Wildcards<input name="wildcardCount" type="number" min="0" max="64" defaultValue="0" /></label>
              </div>
              <label>Advancement<select name="advancementType" defaultValue="top_per_pool">
                <option value="top_per_pool">Top teams per pool</option>
                <option value="top_plus_wildcards">Top teams plus wildcards</option>
                <option value="manual_selection">Manual TD selection</option>
              </select></label>
              <div className="form-grid two-column compact-fields">
                <label>Time block starts<input name="divisionStart" type="datetime-local" /></label>
                <label>Time block ends<input name="divisionEnd" type="datetime-local" /></label>
              </div>
              <label>Status<select name="divisionStatus" defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="registration_open">Registration open</option>
                <option value="registration_closed">Registration closed</option>
              </select></label>
              <div className="inline-checks">
                <label className="check-row"><input name="isJunior" type="checkbox" /> Junior</label>
                <label className="check-row"><input name="autoBalancePools" type="checkbox" defaultChecked /> Auto-balance pools</label>
                <label className="check-row"><input name="bronzeMatchEnabled" type="checkbox" defaultChecked /> Bronze match</label>
                <label className="check-row"><input name="showSponsors" type="checkbox" /> Sponsor slides</label>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-body actions stacked">
              <button className="primary" type="submit">Create tournament</button>
              <Link className="secondary-action" href="/admin">Back to admin</Link>
              <Link className="secondary-action" href="/admin/operations">Open operations</Link>
            </div>
          </section>
        </aside>
      </form>
    </>
  );
}
