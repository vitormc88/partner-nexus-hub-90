// Stage-aware follow-up task defaults.
// Used by Deal Health "Create suggested task" and DealTaskList "Create Follow-up Task" actions.

import { addBusinessDays, format } from "date-fns";

export type TaskCategory =
  | "Follow-up"
  | "Call"
  | "Demo"
  | "Quotation"
  | "Proposal Review"
  | "Pricing"
  | "Internal"
  | "Other";

export const TASK_CATEGORIES: TaskCategory[] = [
  "Follow-up",
  "Call",
  "Demo",
  "Quotation",
  "Proposal Review",
  "Pricing",
  "Internal",
  "Other",
];

export interface FollowUpDefaults {
  title: string;
  description?: string;
  priority: "Low" | "Medium" | "High";
  category: TaskCategory;
  dueDate: string; // yyyy-MM-dd
}

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function daysFromNow(businessDays: number): string {
  try {
    return fmt(addBusinessDays(new Date(), businessDays));
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + businessDays);
    return d.toISOString().slice(0, 10);
  }
}

/** Stage-aware default for a "follow-up / next action" task. */
export function followUpDefaultsForStage(stage: string | null | undefined): FollowUpDefaults {
  switch (stage) {
    case "Open Lead":
      return {
        title: "Schedule discovery call",
        priority: "Medium",
        category: "Call",
        dueDate: daysFromNow(1),
      };
    case "Qualified":
      return {
        title: "Book product demonstration",
        priority: "Medium",
        category: "Demo",
        dueDate: daysFromNow(3),
      };
    case "Demo":
      return {
        title: "Follow up after demo",
        priority: "High",
        category: "Follow-up",
        dueDate: daysFromNow(2),
      };
    case "Proposal Sent":
      return {
        title: "Follow up proposal feedback",
        priority: "Medium",
        category: "Follow-up",
        dueDate: daysFromNow(5),
      };
    case "Advance 1":
      return {
        title: "Identify blockers and confirm next milestone",
        priority: "Medium",
        category: "Follow-up",
        dueDate: daysFromNow(3),
      };
    case "Meeting 2":
      return {
        title: "Clarify open objections",
        priority: "High",
        category: "Follow-up",
        dueDate: daysFromNow(3),
      };
    case "Advance 2":
      return {
        title: "Prepare closing plan",
        priority: "High",
        category: "Internal",
        dueDate: daysFromNow(3),
      };
    case "Price Negotiation":
      return {
        title: "Clarify pricing objections",
        priority: "High",
        category: "Pricing",
        dueDate: daysFromNow(3),
      };
    default:
      return {
        title: "Follow-up",
        priority: "Medium",
        category: "Follow-up",
        dueDate: daysFromNow(3),
      };
  }
}

/** Build defaults from a "next best action" suggestion (Deal Health). */
export function defaultsFromSuggestion(
  stage: string | null | undefined,
  suggestionLabel: string,
  suggestionHint?: string
): FollowUpDefaults {
  const base = followUpDefaultsForStage(stage);
  return {
    ...base,
    title: suggestionLabel || base.title,
    description: suggestionHint || undefined,
  };
}
