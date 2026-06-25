// Partner Brief — deterministic executive briefing.
// Data prep is intentionally decoupled from presentation so an AI-generated
// summary can later replace `summary` while reusing the same `BriefData`.

import type { PartnerNote, ActionItem } from "@/hooks/usePartnerNotes";

export type Momentum = "Growing" | "Stable" | "Slowing" | "Recovering" | "New";

export interface BriefData {
  isNew: boolean;
  summary: string;
  currentFocus: string[];
  openCommitments: string[];
  recentProgress: string[];
  momentum: Momentum;
  momentumHint: string;
}

export interface BriefInput {
  partner: {
    company_name?: string | null;
    onboarding_status?: string | null;
    start_date?: string | null;
    created_at?: string | null;
  };
  maturity?: string | null; // from partner_metrics: New / Onboarding / Active / Mature / Dormant
  score?: number | null;
  clients: any[];
  deals: any[];
  notes: PartnerNote[];
  renewalsUpcoming?: number;
}

const DAY = 86400000;

function daysAgo(iso?: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(iso).getTime()) / DAY;
}

function uniqueOrdered(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function extractCurrentFocus(notes: PartnerNote[]): string[] {
  // Score topics by recency + frequency over last 120 days
  const cutoff = 120;
  const score = new Map<string, { label: string; weight: number }>();
  for (const n of notes) {
    const age = daysAgo(n.interaction_date || n.created_at);
    if (age > cutoff) continue;
    const recencyWeight = age <= 14 ? 3 : age <= 45 ? 2 : 1;
    for (const t of n.topics || []) {
      if (!t) continue;
      const key = t.trim().toLowerCase();
      if (!key) continue;
      const prev = score.get(key);
      score.set(key, {
        label: prev?.label || t.trim(),
        weight: (prev?.weight || 0) + recencyWeight,
      });
    }
  }
  return Array.from(score.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((x) => x.label);
}

function extractOpenCommitments(notes: PartnerNote[]): string[] {
  const open: { item: ActionItem; date: string }[] = [];
  for (const n of notes) {
    const date = n.interaction_date || n.created_at;
    for (const ai of n.action_items || []) {
      if (!ai || !ai.description) continue;
      if (ai.status && ai.status !== "Open") continue;
      open.push({ item: ai, date });
    }
  }
  // Sort by due date (soonest first), then by recency of entry
  open.sort((a, b) => {
    const ad = a.item.due_date ? new Date(a.item.due_date).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.item.due_date ? new Date(b.item.due_date).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return uniqueOrdered(open.map((x) => x.item.description)).slice(0, 4);
}

function extractRecentProgress(input: BriefInput): string[] {
  const window = 90;
  const out: string[] = [];
  const deals = input.deals || [];
  const clients = input.clients || [];
  const notes = input.notes || [];

  const newDeals = deals.filter((d) => daysAgo(d.created_at) <= window).length;
  const wonDeals = deals.filter(
    (d) => d.status === "Won" && daysAgo(d.won_at || d.status_changed_at || d.updated_at) <= window,
  ).length;
  const newClients = clients.filter((c) => daysAgo(c.created_at) <= window).length;
  const onboardingDone =
    (input.partner.onboarding_status || "").toLowerCase() === "completed" &&
    notes.some((n) => /onboarding/i.test(n.content || "") && daysAgo(n.interaction_date || n.created_at) <= window);
  const meetingsDone = notes.filter(
    (n) => /meeting|review/i.test(n.interaction_type || "") && daysAgo(n.interaction_date || n.created_at) <= window,
  ).length;
  const decisionsLogged = notes.reduce((acc, n) => {
    if (daysAgo(n.interaction_date || n.created_at) > window) return acc;
    return acc + (n.decisions?.length || 0);
  }, 0);

  if (wonDeals > 0) out.push(`${wonDeals} deal${wonDeals === 1 ? "" : "s"} won`);
  if (newDeals > 0) out.push(`${newDeals} opportunit${newDeals === 1 ? "y" : "ies"} created`);
  if (newClients > 0) out.push(`${newClients} new customer${newClients === 1 ? "" : "s"} added`);
  if (onboardingDone) out.push("Onboarding completed");
  if (decisionsLogged >= 3) out.push(`${decisionsLogged} key decisions logged`);
  else if (meetingsDone >= 2) out.push(`${meetingsDone} meetings held`);

  return out.slice(0, 4);
}

function computeMomentum(input: BriefInput): { momentum: Momentum; hint: string } {
  const maturity = (input.maturity || "").toLowerCase();
  if (maturity === "new" || maturity === "onboarding") {
    return { momentum: "New", hint: "Partnership in onboarding phase." };
  }

  const deals = input.deals || [];
  const notes = input.notes || [];
  const score = input.score ?? 0;

  const last30 = (arr: any[], key: (x: any) => string | null | undefined) =>
    arr.filter((x) => daysAgo(key(x)) <= 30).length;
  const last90 = (arr: any[], key: (x: any) => string | null | undefined) =>
    arr.filter((x) => daysAgo(key(x)) <= 90).length;

  const recentNotes30 = last30(notes, (n) => n.interaction_date || n.created_at);
  const recentNotes90 = last90(notes, (n) => n.interaction_date || n.created_at);
  const recentDeals30 = last30(deals, (d) => d.created_at);
  const recentDeals90 = last90(deals, (d) => d.created_at);
  const wonRecent = last90(
    deals.filter((d) => d.status === "Won"),
    (d) => d.won_at || d.status_changed_at || d.updated_at,
  );

  const recent = recentNotes30 + recentDeals30;
  const prior = recentNotes90 - recentNotes30 + (recentDeals90 - recentDeals30);

  if (recent >= 3 && (wonRecent > 0 || recent > prior)) {
    return { momentum: "Growing", hint: "Increasing engagement and commercial activity." };
  }
  if (recent === 0 && prior === 0) {
    return { momentum: "Slowing", hint: "No recent meetings or deal activity." };
  }
  if (recent === 0 && prior > 0) {
    return { momentum: "Slowing", hint: "Activity has dropped in the last 30 days." };
  }
  if (recent > 0 && prior === 0) {
    return { momentum: "Recovering", hint: "Engagement resuming after a quiet period." };
  }
  if (score >= 60) return { momentum: "Stable", hint: "Steady cadence with regular activity." };
  return { momentum: "Stable", hint: "Cadence is consistent." };
}

function buildSummary(input: BriefInput, focus: string[], momentum: Momentum): string {
  const name = input.partner.company_name?.trim() || "This partner";
  const clientCount = input.clients?.length || 0;
  const openDeals = (input.deals || []).filter((d) => d.status === "Open").length;
  const wonDeals = (input.deals || []).filter((d) => d.status === "Won").length;
  const maturity = (input.maturity || "").toLowerCase();

  const sentences: string[] = [];

  // Opening — partnership posture
  if (maturity === "new" || maturity === "onboarding") {
    sentences.push(
      `${name} is still in the onboarding phase and the relationship is beginning to take shape.`,
    );
  } else if (momentum === "Growing") {
    sentences.push(
      `${name} is commercially active with healthy engagement and positive recent momentum.`,
    );
  } else if (momentum === "Slowing") {
    sentences.push(
      `${name} has been quieter than usual and the relationship would benefit from a deliberate touchpoint.`,
    );
  } else if (momentum === "Recovering") {
    sentences.push(
      `${name} is re-engaging after a quiet period, with renewed activity over the past weeks.`,
    );
  } else {
    sentences.push(
      `${name} is an established partner with a steady cadence of meetings and commercial activity.`,
    );
  }

  // Middle — concrete footprint
  const footprint: string[] = [];
  if (clientCount > 0) footprint.push(`${clientCount} active customer${clientCount === 1 ? "" : "s"}`);
  if (openDeals > 0) footprint.push(`${openDeals} open opportunit${openDeals === 1 ? "y" : "ies"}`);
  if (wonDeals > 0) footprint.push(`${wonDeals} closed deal${wonDeals === 1 ? "" : "s"} on record`);
  if (footprint.length) {
    sentences.push(`Current footprint includes ${footprint.join(", ")}.`);
  }

  // Focus
  if (focus.length) {
    sentences.push(
      `Recent discussions have centred on ${focus.slice(0, 2).join(" and ")}${focus.length > 2 ? `, with ${focus[2]} also on the table` : ""}.`,
    );
  }

  // Forward look
  if (maturity === "new" || maturity === "onboarding") {
    sentences.push("Immediate focus should be converting the first customer and maintaining a regular relationship cadence.");
  } else if (momentum === "Slowing") {
    sentences.push("A short check-in is the most useful next step to confirm priorities and unblock open items.");
  } else if ((input.renewalsUpcoming || 0) > 0) {
    sentences.push("Upcoming renewals deserve attention to protect recurring revenue.");
  }

  return sentences.join(" ");
}

export function buildPartnerBrief(input: BriefInput): BriefData {
  const notes = input.notes || [];
  const deals = input.deals || [];
  const clients = input.clients || [];
  const maturity = (input.maturity || "").toLowerCase();

  const isNew =
    (maturity === "new" && notes.length === 0 && deals.length === 0 && clients.length === 0) ||
    (notes.length === 0 && deals.length === 0 && clients.length === 0);

  if (isNew) {
    return {
      isNew: true,
      summary:
        "This partnership has recently been created. Continue onboarding activities and begin documenting interactions to build a richer relationship history.",
      currentFocus: [],
      openCommitments: [],
      recentProgress: [],
      momentum: "New",
      momentumHint: "Not enough history yet to assess momentum.",
    };
  }

  const focus = extractCurrentFocus(notes);
  const commitments = extractOpenCommitments(notes);
  const progress = extractRecentProgress(input);
  const { momentum, hint } = computeMomentum(input);
  const summary = buildSummary(input, focus, momentum);

  return {
    isNew: false,
    summary,
    currentFocus: focus,
    openCommitments: commitments,
    recentProgress: progress,
    momentum,
    momentumHint: hint,
  };
}
