/**
 * Business Proposal Engine
 *
 * Computes KeepIT and UseIT option totals for a Business proposal config.
 * Independent from the Professional engine — must NOT alter Professional logic.
 */
import type { PricingRule, ProposalDeployment, ProposalLicenseModel } from "@/types/proposal";

export interface BusinessConfig {
  /** Required maintenance module is always ON. */
  includeRequests: boolean;
  includeStock: boolean;
  includePurchase: boolean;
  pluginImport: boolean;
  pluginWorkflow: boolean;
  pluginAdvancedReports: boolean;
  pluginSLA: boolean;
  api: boolean;
  /** Additional BackOffice users beyond the 3 included. */
  additionalBackoffice: number;
  /** Additional Web/Mobile users beyond the 1 included. */
  additionalWebUsers: number;
  deployment: ProposalDeployment;
  /** Implementation services configuration. */
  implementation: BusinessImplementationConfig;
}

export interface BusinessImplementationConfig {
  type: "RCI Business" | "Onsite" | "Custom";
  liveSessions: number;
  /** Custom one-time services (label + price). */
  customServices: Array<{ label: string; price: number }>;
  /** Onsite-only fields. */
  onsiteClientDays?: number;
  onsiteBackofficeDays?: number;
  onsiteRegion?: string;
}

export interface BusinessLineItem {
  code: string;
  label: string;
  category: "module" | "plugin" | "backoffice_user" | "web_user" | "api" | "hosting" | "support" | "service";
  /** Raw unit price from pricing rule. */
  unitPrice: number;
  qty: number;
  /** Yearly amount (for recurring) or one-time amount. */
  amount: number;
  /** Whether this line recurs in Year 2+. */
  recurring: boolean;
  /** Frequency descriptor for display. */
  frequency: "one-time" | "yearly" | "per-user-month";
}

export interface BusinessOptionTotals {
  model: ProposalLicenseModel;
  software: BusinessLineItem[];
  api: BusinessLineItem | null;
  hosting: BusinessLineItem[];
  sat: BusinessLineItem | null;
  services: BusinessLineItem[];
  /** License subtotal used for S&AT calculation. */
  licenseSubtotal: number;
  /** Year 1 = software (one-time for keepit OR yearly for useit) + sat + api + hosting + services */
  totalYear1: number;
  /** Year 2+ recurring total. */
  totalYear2Plus: number;
  /** 5-year cumulative total: Y1 + 4 × Y2+. */
  totalFiveYears: number;
}

export interface BusinessEngineOutput {
  keepit: BusinessOptionTotals | null;
  useit: BusinessOptionTotals | null;
}

const findBusinessRule = (rules: PricingRule[], code: string) =>
  rules.find((r) => r.active && r.code === code);

const yearlyFromUnit = (rule: PricingRule, qty: number): number => {
  if (rule.unit_type === "per-user-month" || rule.billing_frequency === "per-user-month") {
    return rule.unit_price * qty * 12;
  }
  return rule.unit_price * qty;
};

const buildLine = (
  rule: PricingRule | undefined,
  qty: number,
  category: BusinessLineItem["category"],
  recurring: boolean,
  amountOverride?: number,
): BusinessLineItem | null => {
  if (!rule || qty <= 0) return null;
  const isPerUserMonth =
    rule.unit_type === "per-user-month" || rule.billing_frequency === "per-user-month";
  const isYearly = rule.unit_type === "yearly" || rule.billing_frequency === "yearly";
  const frequency: BusinessLineItem["frequency"] = isPerUserMonth
    ? "per-user-month"
    : isYearly
    ? "yearly"
    : "one-time";
  const amount = amountOverride !== undefined ? amountOverride : yearlyFromUnit(rule, qty);
  return {
    code: rule.code,
    label: rule.label,
    category,
    unitPrice: rule.unit_price,
    qty,
    amount,
    recurring,
    frequency,
  };
};

/**
 * Compute one option (KeepIT or UseIT) for the given Business config.
 * Returns null if required pricing rules are missing.
 */
export function computeBusinessOption(
  rules: PricingRule[],
  cfg: BusinessConfig,
  model: ProposalLicenseModel,
): BusinessOptionTotals | null {
  const isKeepIt = model === "keepit";
  const prefix = isKeepIt ? "BUS_KEEPIT_" : "BUS_USEIT_";
  // For KeepIT, modules are one-time (not recurring).
  // For UseIT, modules are yearly (recurring).
  const modulesRecurring = !isKeepIt;

  const software: BusinessLineItem[] = [];

  // Maintenance module — always required
  const mainModule = findBusinessRule(rules, `${prefix}MAINTENANCE_MODULE`);
  if (!mainModule) return null;
  software.push(buildLine(mainModule, 1, "module", modulesRecurring)!);

  if (cfg.includeRequests) {
    const r = findBusinessRule(rules, `${prefix}REQUESTS_MODULE`);
    if (r) software.push(buildLine(r, 1, "module", modulesRecurring)!);
  }
  if (cfg.includeStock) {
    const r = findBusinessRule(rules, `${prefix}STOCK_MODULE`);
    if (r) software.push(buildLine(r, 1, "module", modulesRecurring)!);
  }
  if (cfg.includePurchase) {
    const r = findBusinessRule(rules, `${prefix}PURCHASE_MODULE`);
    if (r) software.push(buildLine(r, 1, "module", modulesRecurring)!);
  }
  if (cfg.pluginImport) {
    const r = findBusinessRule(rules, `${prefix}PLUGIN_IMPORT`);
    if (r) software.push(buildLine(r, 1, "plugin", modulesRecurring)!);
  }
  if (cfg.pluginWorkflow) {
    const r = findBusinessRule(rules, `${prefix}PLUGIN_WORKFLOW`);
    if (r) software.push(buildLine(r, 1, "plugin", modulesRecurring)!);
  }
  if (cfg.pluginAdvancedReports) {
    const r = findBusinessRule(rules, `${prefix}PLUGIN_ADVANCED_REPORTS`);
    if (r) software.push(buildLine(r, 1, "plugin", modulesRecurring)!);
  }
  if (cfg.pluginSLA) {
    const r = findBusinessRule(rules, `${prefix}PLUGIN_SLA`);
    if (r) software.push(buildLine(r, 1, "plugin", modulesRecurring)!);
  }

  if (cfg.additionalBackoffice > 0) {
    const r = findBusinessRule(rules, `${prefix}ADDITIONAL_BACKOFFICE`);
    if (r) software.push(buildLine(r, cfg.additionalBackoffice, "backoffice_user", modulesRecurring)!);
  }

  // Web/Mobile users — always recurring (per-user-month -> yearly *12)
  if (cfg.additionalWebUsers > 0) {
    const w = findBusinessRule(rules, "BUS_WEB_MOBILE_USER");
    if (w) software.push(buildLine(w, cfg.additionalWebUsers, "web_user", true)!);
  }

  const licenseSubtotal = software.reduce((s, l) => s + l.amount, 0);

  // API
  let api: BusinessLineItem | null = null;
  if (cfg.api) {
    const r = findBusinessRule(rules, "BUS_API");
    if (r) api = buildLine(r, 1, "api", true);
  }

  // SaaS hosting
  const hosting: BusinessLineItem[] = [];
  if (cfg.deployment === "saas") {
    const base = findBusinessRule(rules, "BUS_SAAS_HOSTING_BASE");
    if (base) hosting.push(buildLine(base, 1, "hosting", true)!);
    if (cfg.additionalBackoffice > 0) {
      const ext = findBusinessRule(rules, "BUS_SAAS_HOSTING_ADDITIONAL_BACKOFFICE");
      if (ext) hosting.push(buildLine(ext, cfg.additionalBackoffice, "hosting", true)!);
    }
  }

  // S&AT
  let sat: BusinessLineItem | null = null;
  const satRule = findBusinessRule(rules, isKeepIt ? "BUS_KEEPIT_SAT" : "BUS_USEIT_SAT");
  if (satRule) {
    if (isKeepIt) {
      const pct = Number(satRule.support_percentage || 0) / 100;
      const amount = licenseSubtotal * pct;
      sat = buildLine(satRule, 1, "support", true, amount);
    } else {
      // included = 0
      sat = buildLine(satRule, 1, "support", true, 0);
    }
  }

  // Services (one-time)
  const services: BusinessLineItem[] = [];
  if (cfg.implementation.type === "RCI Business") {
    const baseRci = findBusinessRule(rules, "BUS_RCI_BASE");
    if (baseRci) services.push(buildLine(baseRci, 1, "service", false)!);
    if (cfg.includeStock) {
      const r = findBusinessRule(rules, "BUS_RCI_STOCK");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.includeRequests) {
      const r = findBusinessRule(rules, "BUS_RCI_REQUESTS");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.includePurchase) {
      const r = findBusinessRule(rules, "BUS_RCI_PURCHASING");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.additionalWebUsers > 0) {
      const r = findBusinessRule(rules, "BUS_RCI_WEB");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.pluginWorkflow) {
      const r = findBusinessRule(rules, "BUS_RCI_PLUGIN_WORKFLOW");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.pluginImport) {
      const r = findBusinessRule(rules, "BUS_RCI_PLUGIN_IMPORT");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.pluginSLA) {
      const r = findBusinessRule(rules, "BUS_RCI_PLUGIN_SLA");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.pluginAdvancedReports) {
      const r = findBusinessRule(rules, "BUS_RCI_PLUGIN_ADVANCED_REPORTS");
      if (r) services.push(buildLine(r, 1, "service", false)!);
    }
    if (cfg.implementation.liveSessions > 0) {
      const r = findBusinessRule(rules, "BUS_RCI_LIVE_SESSION");
      if (r) services.push(buildLine(r, cfg.implementation.liveSessions, "service", false)!);
    }
  }

  // Custom services lines
  for (const cs of cfg.implementation.customServices || []) {
    if (cs.price > 0) {
      services.push({
        code: "custom",
        label: cs.label || "Custom service",
        category: "service",
        unitPrice: cs.price,
        qty: 1,
        amount: cs.price,
        recurring: false,
        frequency: "one-time",
      });
    }
  }

  // Year 1 = software (sum) + api + hosting + sat + services
  const softwareTotal = software.reduce((s, l) => s + l.amount, 0);
  const apiAmount = api?.amount || 0;
  const hostingAmount = hosting.reduce((s, l) => s + l.amount, 0);
  const satAmount = sat?.amount || 0;
  const servicesTotal = services.reduce((s, l) => s + l.amount, 0);

  const totalYear1 = softwareTotal + apiAmount + hostingAmount + satAmount + servicesTotal;

  // Year 2+ = recurring software + api + hosting + sat
  const recurringSoftware = software.filter((l) => l.recurring).reduce((s, l) => s + l.amount, 0);
  const totalYear2Plus = recurringSoftware + apiAmount + hostingAmount + satAmount;

  const totalFiveYears = totalYear1 + totalYear2Plus * 4;

  return {
    model,
    software,
    api,
    hosting,
    sat,
    services,
    licenseSubtotal,
    totalYear1,
    totalYear2Plus,
    totalFiveYears,
  };
}

/** Compute both options (KeepIT and UseIT) for comparison mode. */
export function computeBusinessOptions(
  rules: PricingRule[],
  cfg: BusinessConfig,
  models: ProposalLicenseModel[] = ["keepit", "useit"],
): BusinessEngineOutput {
  return {
    keepit: models.includes("keepit") ? computeBusinessOption(rules, cfg, "keepit") : null,
    useit: models.includes("useit") ? computeBusinessOption(rules, cfg, "useit") : null,
  };
}

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  includeRequests: false,
  includeStock: false,
  includePurchase: false,
  pluginImport: false,
  pluginWorkflow: false,
  pluginAdvancedReports: false,
  pluginSLA: false,
  api: false,
  additionalBackoffice: 0,
  additionalWebUsers: 0,
  deployment: "saas",
  implementation: {
    type: "RCI Business",
    liveSessions: 0,
    customServices: [],
    onsiteClientDays: 0,
    onsiteBackofficeDays: 0,
    onsiteRegion: "",
  },
};
