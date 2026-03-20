export type DealStage = "Lead" | "Meeting" | "Demo" | "Follow-up" | "Negotiation" | "Won" | "Lost";
export type DealStatus = "Open" | "Won" | "Lost";
export type LeadSource = "Inbound" | "Outbound" | "Partner" | "HQ";
export type RegistrationStatus = "Pending" | "Approved" | "Rejected";
export type CommissionPaymentStatus = "Pending" | "Approved" | "Paid";

export interface Deal {
  id: string;
  partnerId: string;
  partnerName: string;
  companyName: string;
  country: string;
  industry: string;
  leadSource: LeadSource;
  stage: DealStage;
  expectedValue: number;
  totalValue: number;
  probability: number;
  expectedCloseDate: string;
  assignedSalesperson: string;
  description: string;
  notes: string;
  status: DealStatus;
  agingDays: number;
  lastActivityAt: string;
  stageEnteredAt: string;
  createdAt: string;
  taskCount: number;
  contactCount: number;
  lastActivityType: "call" | "email" | "meeting" | "note";
  registrationStatus?: RegistrationStatus;
}

export interface DealContact {
  id: string;
  dealId: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  isDecisionMaker: boolean;
}

export interface DealTask {
  id: string;
  dealId: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface DealActivity {
  id: string;
  dealId: string;
  activityType: "call" | "email" | "meeting" | "note" | "status_change";
  subject: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

export interface Commission {
  id: string;
  dealId: string;
  partnerId: string;
  partnerName: string;
  companyName: string;
  commissionType: "New Business" | "Renewal" | "Upsell";
  softwareRevenue: number;
  servicesRevenue: number;
  partnerMarginPct: number;
  commissionValue: number;
  paymentStatus: CommissionPaymentStatus;
  createdAt: string;
}

const stages: DealStage[] = ["Lead", "Meeting", "Demo", "Follow-up", "Negotiation", "Won", "Lost"];

export const mockDeals: Deal[] = [
  {
    id: "d1", partnerId: "1", partnerName: "Iberian Solutions Lda", companyName: "Cimentos do Tejo SA", country: "Portugal", industry: "Manufacturing",
    leadSource: "Partner", stage: "Negotiation", expectedValue: 48000, totalValue: 0, probability: 75, expectedCloseDate: "2026-04-15",
    assignedSalesperson: "João Ferreira", description: "Enterprise CMMS for 3 cement plants", notes: "", status: "Open", agingDays: 42,
    lastActivityAt: "2026-03-18", stageEnteredAt: "2026-03-05", createdAt: "2026-02-06", taskCount: 3, contactCount: 2, lastActivityType: "meeting", registrationStatus: "Approved",
  },
  {
    id: "d2", partnerId: "1", partnerName: "Iberian Solutions Lda", companyName: "Águas de Lisboa", country: "Portugal", industry: "Utilities",
    leadSource: "Inbound", stage: "Demo", expectedValue: 32000, totalValue: 0, probability: 50, expectedCloseDate: "2026-05-10",
    assignedSalesperson: "Ana Costa", description: "Water treatment facility maintenance system", notes: "", status: "Open", agingDays: 28,
    lastActivityAt: "2026-03-17", stageEnteredAt: "2026-03-12", createdAt: "2026-02-20", taskCount: 2, contactCount: 1, lastActivityType: "email",
  },
  {
    id: "d3", partnerId: "2", partnerName: "Nordic Maintenance AB", companyName: "Volvo Facility Mgmt", country: "Sweden", industry: "Automotive",
    leadSource: "Partner", stage: "Follow-up", expectedValue: 67000, totalValue: 0, probability: 40, expectedCloseDate: "2026-06-01",
    assignedSalesperson: "Erik Johansson", description: "Fleet and facility maintenance for Gothenburg campus", notes: "", status: "Open", agingDays: 55,
    lastActivityAt: "2026-03-10", stageEnteredAt: "2026-02-28", createdAt: "2026-01-24", taskCount: 1, contactCount: 3, lastActivityType: "call", registrationStatus: "Approved",
  },
  {
    id: "d4", partnerId: "3", partnerName: "LATAM Industrial Group", companyName: "Petrobras Refinaria Duque", country: "Brazil", industry: "Oil & Gas",
    leadSource: "HQ", stage: "Meeting", expectedValue: 125000, totalValue: 0, probability: 25, expectedCloseDate: "2026-07-30",
    assignedSalesperson: "Ricardo Silva", description: "Refinery maintenance management system", notes: "", status: "Open", agingDays: 18,
    lastActivityAt: "2026-03-19", stageEnteredAt: "2026-03-15", createdAt: "2026-03-02", taskCount: 4, contactCount: 2, lastActivityType: "meeting", registrationStatus: "Pending",
  },
  {
    id: "d5", partnerId: "8", partnerName: "Asia Pacific CMMS Pte", companyName: "Singapore General Hospital", country: "Singapore", industry: "Healthcare",
    leadSource: "Outbound", stage: "Lead", expectedValue: 89000, totalValue: 0, probability: 15, expectedCloseDate: "2026-09-01",
    assignedSalesperson: "Wei Lin Tan", description: "Hospital facility management platform", notes: "", status: "Open", agingDays: 5,
    lastActivityAt: "2026-03-19", stageEnteredAt: "2026-03-15", createdAt: "2026-03-15", taskCount: 0, contactCount: 1, lastActivityType: "note",
  },
  {
    id: "d6", partnerId: "8", partnerName: "Asia Pacific CMMS Pte", companyName: "Changi Airport Group", country: "Singapore", industry: "Aviation",
    leadSource: "Partner", stage: "Negotiation", expectedValue: 156000, totalValue: 0, probability: 80, expectedCloseDate: "2026-04-01",
    assignedSalesperson: "Priya Nair", description: "Airport infrastructure maintenance system", notes: "", status: "Open", agingDays: 67,
    lastActivityAt: "2026-03-18", stageEnteredAt: "2026-02-20", createdAt: "2026-01-12", taskCount: 5, contactCount: 4, lastActivityType: "email", registrationStatus: "Approved",
  },
  {
    id: "d7", partnerId: "6", partnerName: "Afrique Maintenance SARL", companyName: "OCP Group", country: "Morocco", industry: "Mining",
    leadSource: "Partner", stage: "Demo", expectedValue: 45000, totalValue: 0, probability: 35, expectedCloseDate: "2026-06-15",
    assignedSalesperson: "Youssef Benhaddou", description: "Mining operations maintenance", notes: "", status: "Open", agingDays: 22,
    lastActivityAt: "2026-03-16", stageEnteredAt: "2026-03-10", createdAt: "2026-02-26", taskCount: 1, contactCount: 2, lastActivityType: "call",
  },
  {
    id: "d8", partnerId: "1", partnerName: "Iberian Solutions Lda", companyName: "TAP Air Portugal", country: "Portugal", industry: "Aviation",
    leadSource: "Inbound", stage: "Won", expectedValue: 72000, totalValue: 72000, probability: 100, expectedCloseDate: "2026-02-28",
    assignedSalesperson: "João Ferreira", description: "Aircraft ground support equipment maintenance", notes: "Closed Q1", status: "Won", agingDays: 90,
    lastActivityAt: "2026-02-28", stageEnteredAt: "2026-02-28", createdAt: "2025-12-01", taskCount: 0, contactCount: 3, lastActivityType: "meeting", registrationStatus: "Approved",
  },
  {
    id: "d9", partnerId: "2", partnerName: "Nordic Maintenance AB", companyName: "Ericsson AB", country: "Sweden", industry: "Telecom",
    leadSource: "Partner", stage: "Lost", expectedValue: 38000, totalValue: 0, probability: 0, expectedCloseDate: "2026-01-31",
    assignedSalesperson: "Erik Johansson", description: "Telecom infrastructure maintenance", notes: "Lost to competitor", status: "Lost", agingDays: 120,
    lastActivityAt: "2026-01-31", stageEnteredAt: "2026-01-31", createdAt: "2025-10-05", taskCount: 0, contactCount: 1, lastActivityType: "note",
  },
  {
    id: "d10", partnerId: "4", partnerName: "Gulf Tech Services LLC", companyName: "ADNOC Facilities", country: "UAE", industry: "Oil & Gas",
    leadSource: "Partner", stage: "Lead", expectedValue: 215000, totalValue: 0, probability: 10, expectedCloseDate: "2026-10-01",
    assignedSalesperson: "Ahmed Al-Rashid", description: "Oil facility maintenance management", notes: "", status: "Open", agingDays: 3,
    lastActivityAt: "2026-03-19", stageEnteredAt: "2026-03-17", createdAt: "2026-03-17", taskCount: 0, contactCount: 1, lastActivityType: "note", registrationStatus: "Pending",
  },
];

export const mockDealContacts: DealContact[] = [
  { id: "dc1", dealId: "d1", contactName: "Pedro Almeida", role: "Plant Director", email: "pedro@cimentostejo.pt", phone: "+351 21 444 5566", isDecisionMaker: true },
  { id: "dc2", dealId: "d1", contactName: "Maria Lopes", role: "Maintenance Manager", email: "maria@cimentostejo.pt", phone: "+351 21 444 5567", isDecisionMaker: false },
  { id: "dc3", dealId: "d6", contactName: "James Lim", role: "VP Operations", email: "james.lim@changiairport.com", phone: "+65 6541 2300", isDecisionMaker: true },
  { id: "dc4", dealId: "d6", contactName: "Rachel Ng", role: "Head of Engineering", email: "rachel.ng@changiairport.com", phone: "+65 6541 2301", isDecisionMaker: false },
];

export const mockDealTasks: DealTask[] = [
  { id: "dt1", dealId: "d1", title: "Send revised proposal", assignedTo: "João Ferreira", dueDate: "2026-03-22", isCompleted: false },
  { id: "dt2", dealId: "d1", title: "Technical validation call", assignedTo: "Ana Costa", dueDate: "2026-03-25", isCompleted: false },
  { id: "dt3", dealId: "d6", title: "Final pricing approval", assignedTo: "Wei Lin Tan", dueDate: "2026-03-20", isCompleted: false },
  { id: "dt4", dealId: "d4", title: "Schedule needs analysis", assignedTo: "Ricardo Silva", dueDate: "2026-03-24", isCompleted: false },
];

export const mockDealActivities: DealActivity[] = [
  { id: "da1", dealId: "d1", activityType: "meeting", subject: "Negotiation meeting", description: "Discussed pricing for 3-plant deployment. Client requested volume discount.", performedBy: "João Ferreira", createdAt: "2026-03-18T14:00:00Z" },
  { id: "da2", dealId: "d1", activityType: "email", subject: "Proposal sent", description: "Sent revised proposal with 15% volume discount for 3-year contract.", performedBy: "Ana Costa", createdAt: "2026-03-15T10:30:00Z" },
  { id: "da3", dealId: "d6", activityType: "call", subject: "Follow-up call", description: "VP confirmed budget approval. Awaiting legal review.", performedBy: "Priya Nair", createdAt: "2026-03-18T09:00:00Z" },
  { id: "da4", dealId: "d4", activityType: "meeting", subject: "Initial meeting", description: "First meeting with refinery operations team. Strong interest in predictive module.", performedBy: "Ricardo Silva", createdAt: "2026-03-19T11:00:00Z" },
];

export const mockCommissions: Commission[] = [
  { id: "c1", dealId: "d8", partnerId: "1", partnerName: "Iberian Solutions Lda", companyName: "TAP Air Portugal", commissionType: "New Business", softwareRevenue: 72000, servicesRevenue: 18000, partnerMarginPct: 25, commissionValue: 18000, paymentStatus: "Paid", createdAt: "2026-03-01" },
  { id: "c2", dealId: "d1", partnerId: "1", partnerName: "Iberian Solutions Lda", companyName: "Cimentos do Tejo SA", commissionType: "New Business", softwareRevenue: 48000, servicesRevenue: 12000, partnerMarginPct: 25, commissionValue: 12000, paymentStatus: "Pending", createdAt: "2026-03-18" },
  { id: "c3", dealId: "d6", partnerId: "8", partnerName: "Asia Pacific CMMS Pte", companyName: "Changi Airport Group", commissionType: "New Business", softwareRevenue: 156000, servicesRevenue: 45000, partnerMarginPct: 20, commissionValue: 31200, paymentStatus: "Pending", createdAt: "2026-03-18" },
];

export const pipelineStages: { key: DealStage; label: string; color: string }[] = [
  { key: "Lead", label: "Lead / Qualified", color: "bg-slate-100 dark:bg-slate-800" },
  { key: "Meeting", label: "Meeting", color: "bg-blue-50 dark:bg-blue-950" },
  { key: "Demo", label: "Demo / Presentation", color: "bg-indigo-50 dark:bg-indigo-950" },
  { key: "Follow-up", label: "Follow-up", color: "bg-amber-50 dark:bg-amber-950" },
  { key: "Negotiation", label: "Negotiation", color: "bg-orange-50 dark:bg-orange-950" },
  { key: "Won", label: "Won", color: "bg-emerald-50 dark:bg-emerald-950" },
  { key: "Lost", label: "Lost", color: "bg-red-50 dark:bg-red-950" },
];

export function getPipelineStats(deals: Deal[]) {
  const open = deals.filter(d => d.status === "Open");
  const won = deals.filter(d => d.status === "Won");
  const lost = deals.filter(d => d.status === "Lost");
  const totalPipeline = open.reduce((s, d) => s + d.expectedValue, 0);
  const weightedPipeline = open.reduce((s, d) => s + d.expectedValue * (d.probability / 100), 0);
  const wonRevenue = won.reduce((s, d) => s + d.totalValue, 0);
  const winRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const stuckDeals = open.filter(d => d.agingDays > 45);
  return { open: open.length, won: won.length, lost: lost.length, totalPipeline, weightedPipeline, wonRevenue, winRate, stuckDeals: stuckDeals.length };
}
