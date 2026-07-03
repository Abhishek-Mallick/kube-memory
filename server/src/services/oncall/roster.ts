import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listOncalls } from "../pagerduty/client.js";
import { listUsers as listSlackUsers } from "../slack/client.js";

export interface OncallPerson {
  name: string;
  email?: string;
  slackUserId?: string;
  pagerDutyUserId?: string;
  team?: string;
  source: "roster" | "pagerduty" | "slack";
}

interface RosterRow {
  name: string;
  email?: string;
  slack_user_id?: string;
  pagerduty_user_id?: string;
  team?: string;
  active?: string;
}

let cachedRoster: RosterRow[] | null = null;

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function loadRosterCsv(): RosterRow[] {
  if (cachedRoster) return cachedRoster;

  const path = resolve(repoRoot(), "docs/oncall-roster.csv");
  try {
    const raw = readFileSync(path, "utf8");
    const lines = raw.trim().split("\n");
    if (lines.length < 2) {
      cachedRoster = [];
      return cachedRoster;
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    cachedRoster = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ?? "";
      });
      return row as unknown as RosterRow;
    });
    return cachedRoster;
  } catch {
    cachedRoster = [];
    return cachedRoster;
  }
}

export function getRosterEntry(team?: string): OncallPerson | undefined {
  const roster = loadRosterCsv();
  const active = roster.filter((r) => String(r.active ?? "true").toLowerCase() !== "false");
  const match = team
    ? active.find((r) => r.team?.toLowerCase() === team.toLowerCase())
    : active[0];

  if (!match) return undefined;

  return {
    name: match.name,
    email: match.email,
    slackUserId: match.slack_user_id,
    pagerDutyUserId: match.pagerduty_user_id,
    team: match.team,
    source: "roster",
  };
}

async function resolveFromPagerDuty(workspaceId: string): Promise<OncallPerson | undefined> {
  try {
    const oncalls = await listOncalls({ workspaceId, limit: 5 });
    const first = oncalls[0] as { user?: { id?: string; summary?: string; email?: string } } | undefined;
    if (!first?.user) return undefined;

    let slackUserId: string | undefined;
    if (first.user.email) {
      const slackMembers = await listSlackUsers({ workspaceId, limit: 200 });
      const match = (slackMembers as Array<{ profile?: { email?: string }; id?: string }>).find(
        (m) => m.profile?.email?.toLowerCase() === first.user?.email?.toLowerCase(),
      );
      slackUserId = match?.id;
    }

    return {
      name: first.user.summary ?? "On-call",
      email: first.user.email,
      slackUserId,
      pagerDutyUserId: first.user.id,
      source: "pagerduty",
    };
  } catch {
    return undefined;
  }
}

export async function resolveOncall(workspaceId: string, team?: string): Promise<OncallPerson | undefined> {
  const roster = getRosterEntry(team);
  if (roster?.slackUserId || roster?.name) {
    return roster;
  }

  const pd = await resolveFromPagerDuty(workspaceId);
  if (pd) return pd;

  return roster;
}

export function formatSlackMention(person?: OncallPerson): string {
  if (!person) return "";
  if (person.slackUserId) return `<@${person.slackUserId}>`;
  return person.name ? `@${person.name}` : "";
}
