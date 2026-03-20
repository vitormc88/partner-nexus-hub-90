export type RenewalStatus = "green" | "yellow" | "orange" | "red" | "grey";

export interface ClientRecord {
  id: string;
  clientCode: string;
  shortName: string;
  commercialName: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  address: string;
  stateRegion: string;
  postalCode: string;
  city: string;
  country: string;
  sector: string;
  partnerId: string;
  partnerName: string;
  accountManager: string;
  managerOwner: string;
  installationLocation: string;
  firstInstallationDate: string;
  firstInstalledVersion: string;
  currentVersion: string;
  awardReference: string;
  isPremium: boolean;
  hasCustomReports: boolean;
  hasCustomRoutine: boolean;
  isInactive: boolean;
  autoUpdate: boolean;
  productType: string;
  licenseType: string;
  cloudOnpremise: string;
  status: string;
  renewalDate: string;
  contractEndDate: string;
  satEndDate: string;
  backofficeUsers: number;
  mobileAccesses: number;
  webAccesses: number;
  contractValue: number;
  paymentStatus: string;
  observations: string;
}

export interface ClientContact {
  id: string;
  clientId: string;
  contactName: string;
  roleFunction: string;
  phone: string;
  mobile: string;
  email: string;
  notes: string;
}

export interface License {
  id: string;
  clientId: string;
  product: string;
  version: string;
  databaseType: string;
  licenseStartDate: string;
  licenseEndDate: string;
  licenseModel: string;
  periodicity: string;
  satActive: boolean;
  satEndDate: string;
  backofficeUsers: number;
  backofficeEmployeeUsers: number;
  mobileUsers: number;
  webAccesses: number;
  apiAccess: boolean;
}

export interface LicensedModule {
  id: string;
  licenseId: string;
  moduleName: string;
  enabled: boolean;
  licenseType: string;
  periodicity: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface Contract {
  id: string;
  clientId: string;
  priceTableReference: string;
  contractStartDate: string;
  contractEndDate: string;
  noticePeriodDays: number;
  contractValue: number;
  invoicedValue: number;
  numInstallments: number;
  hostingValue: number;
  mwwWebValue: number;
  satValue: number;
  totalValue: number;
  currency: string;
  partnerRevenueSplit: number;
  renewalIncreasePct: number;
  renewalFreezeNotes: string;
  billingNotes: string;
  observations: string;
}

export interface Payment {
  id: string;
  clientId: string;
  paymentStatus: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  outstandingBalance: number;
  lastPaymentDate: string;
  billingNotes: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  noteType: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface ClientCredential {
  id: string;
  clientId: string;
  systemUrl: string;
  login: string;
  username: string;
  passwordSecret: string;
  environmentType: string;
  adminNotes: string;
}

export interface PartnerRenewalSetting {
  partnerId: string;
  greenDays: number;
  yellowDays: number;
  orangeDays: number;
}

// Default global renewal settings
export const defaultRenewalSettings: PartnerRenewalSetting = {
  partnerId: "global",
  greenDays: 90,
  yellowDays: 60,
  orangeDays: 30,
};

export const partnerRenewalSettings: PartnerRenewalSetting[] = [
  { partnerId: "1", greenDays: 90, yellowDays: 60, orangeDays: 30 },
  { partnerId: "2", greenDays: 120, yellowDays: 90, orangeDays: 60 },
  { partnerId: "3", greenDays: 60, yellowDays: 45, orangeDays: 30 },
  { partnerId: "8", greenDays: 90, yellowDays: 60, orangeDays: 30 },
];

export function getRenewalStatus(
  renewalDate: string | null,
  isInactive: boolean,
  settings: PartnerRenewalSetting
): RenewalStatus {
  if (isInactive || !renewalDate) return "grey";
  const now = new Date();
  const renewal = new Date(renewalDate);
  const daysUntil = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "red";
  if (daysUntil <= settings.orangeDays) return "orange";
  if (daysUntil <= settings.yellowDays) return "yellow";
  return "green";
}

export function getRenewalLabel(status: RenewalStatus): string {
  switch (status) {
    case "green": return "Safe";
    case "yellow": return "Approaching";
    case "orange": return "Urgent";
    case "red": return "Overdue";
    case "grey": return "N/A";
  }
}

export const mockClients: ClientRecord[] = [
  {
    id: "c1", clientCode: "PT-ISL-001", shortName: "GALP", commercialName: "GALP Energia S.A.",
    phone: "+351 217 240 000", fax: "+351 217 242 965", email: "manutencao@galp.com",
    website: "www.galp.com", address: "Rua Tomás da Fonseca, Torre C", stateRegion: "Lisboa",
    postalCode: "1600-209", city: "Lisbon", country: "Portugal", sector: "Energy & Utilities",
    partnerId: "1", partnerName: "Iberian Solutions Lda", accountManager: "Ana Costa",
    managerOwner: "João Ferreira", installationLocation: "Lisbon HQ",
    firstInstallationDate: "2019-06-15", firstInstalledVersion: "5.0",
    currentVersion: "6.2", awardReference: "PO-2024-0891", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2026-09-15", contractEndDate: "2027-06-15",
    satEndDate: "2026-09-15", backofficeUsers: 45, mobileAccesses: 120, webAccesses: 200,
    contractValue: 48500, paymentStatus: "Paid", observations: "Strategic key account. Custom SLA agreed.",
  },
  {
    id: "c2", clientCode: "PT-ISL-002", shortName: "Sonae MC", commercialName: "Sonae MC Serviços Partilhados S.A.",
    phone: "+351 229 416 200", fax: "", email: "facilities@sonae.pt",
    website: "www.sonaemc.com", address: "Rua João Mendonça 505", stateRegion: "Porto",
    postalCode: "4464-501", city: "Maia", country: "Portugal", sector: "Retail",
    partnerId: "1", partnerName: "Iberian Solutions Lda", accountManager: "Ana Costa",
    managerOwner: "João Ferreira", installationLocation: "Maia HQ",
    firstInstallationDate: "2020-01-10", firstInstalledVersion: "5.2",
    currentVersion: "6.1", awardReference: "PO-2023-1142", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: true, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "SaaS",
    status: "Active", renewalDate: "2026-04-10", contractEndDate: "2026-12-31",
    satEndDate: "2026-04-10", backofficeUsers: 30, mobileAccesses: 85, webAccesses: 150,
    contractValue: 36200, paymentStatus: "Paid", observations: "Renewal approaching. Multi-site deployment.",
  },
  {
    id: "c3", clientCode: "PT-ISL-003", shortName: "Navigator", commercialName: "The Navigator Company S.A.",
    phone: "+351 234 910 600", fax: "+351 234 910 619", email: "maint@thenavigatorcompany.com",
    website: "www.thenavigatorcompany.com", address: "Apartado 5", stateRegion: "Aveiro",
    postalCode: "3801-901", city: "Aveiro", country: "Portugal", sector: "Paper & Pulp",
    partnerId: "1", partnerName: "Iberian Solutions Lda", accountManager: "Ana Costa",
    managerOwner: "João Ferreira", installationLocation: "Aveiro Factory",
    firstInstallationDate: "2018-03-01", firstInstalledVersion: "4.8",
    currentVersion: "6.2", awardReference: "PO-2024-0233", isPremium: false,
    hasCustomReports: false, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Professional", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2026-07-01", contractEndDate: "2027-03-01",
    satEndDate: "2026-07-01", backofficeUsers: 15, mobileAccesses: 40, webAccesses: 60,
    contractValue: 18900, paymentStatus: "Paid", observations: "",
  },
  {
    id: "c4", clientCode: "SE-NMA-001", shortName: "Volvo CE", commercialName: "Volvo Construction Equipment AB",
    phone: "+46 16 541 00 00", fax: "", email: "maintenance.support@volvo.com",
    website: "www.volvoce.com", address: "Stallbackavägen 25", stateRegion: "Västra Götaland",
    postalCode: "405 08", city: "Gothenburg", country: "Sweden", sector: "Manufacturing",
    partnerId: "2", partnerName: "Nordic Maintenance AB", accountManager: "Erik Johansson",
    managerOwner: "Erik Johansson", installationLocation: "Gothenburg Plant",
    firstInstallationDate: "2022-09-01", firstInstalledVersion: "6.0",
    currentVersion: "6.2", awardReference: "PO-NM-2024-045", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2026-12-01", contractEndDate: "2027-09-01",
    satEndDate: "2026-12-01", backofficeUsers: 60, mobileAccesses: 200, webAccesses: 300,
    contractValue: 72000, paymentStatus: "Paid", observations: "Major account. API integration with SAP.",
  },
  {
    id: "c5", clientCode: "SE-NMA-002", shortName: "SSAB", commercialName: "SSAB Special Steels AB",
    phone: "+46 243 700 00", fax: "", email: "cmms@ssab.com",
    website: "www.ssab.com", address: "Klarabergsviadukten 70", stateRegion: "Stockholm",
    postalCode: "101 24", city: "Stockholm", country: "Sweden", sector: "Steel & Mining",
    partnerId: "2", partnerName: "Nordic Maintenance AB", accountManager: "Erik Johansson",
    managerOwner: "Erik Johansson", installationLocation: "Borlänge Works",
    firstInstallationDate: "2023-03-15", firstInstalledVersion: "6.0",
    currentVersion: "6.1", awardReference: "PO-NM-2023-112", isPremium: false,
    hasCustomReports: false, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Professional", cloudOnpremise: "SaaS",
    status: "Active", renewalDate: "2026-03-25", contractEndDate: "2026-09-15",
    satEndDate: "2026-03-25", backofficeUsers: 20, mobileAccesses: 50, webAccesses: 80,
    contractValue: 24500, paymentStatus: "Pending", observations: "Renewal in 5 days. Contact Erik urgently.",
  },
  {
    id: "c6", clientCode: "BR-LIG-001", shortName: "Petrobras", commercialName: "Petróleo Brasileiro S.A.",
    phone: "+55 21 3224-4477", fax: "", email: "manutencao@petrobras.com.br",
    website: "www.petrobras.com.br", address: "Av. República do Chile 65", stateRegion: "RJ",
    postalCode: "20031-912", city: "Rio de Janeiro", country: "Brazil", sector: "Oil & Gas",
    partnerId: "3", partnerName: "LATAM Industrial Group", accountManager: "Ricardo Silva",
    managerOwner: "Ricardo Silva", installationLocation: "CENPES Research Center",
    firstInstallationDate: "2023-06-01", firstInstalledVersion: "6.0",
    currentVersion: "6.2", awardReference: "PO-LIG-2024-007", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: true, isInactive: false, autoUpdate: false,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2026-06-01", contractEndDate: "2027-06-01",
    satEndDate: "2026-06-01", backofficeUsers: 80, mobileAccesses: 300, webAccesses: 500,
    contractValue: 95000, paymentStatus: "Paid", observations: "Highest value client. Custom API integration.",
  },
  {
    id: "c7", clientCode: "BR-LIG-002", shortName: "Vale", commercialName: "Vale S.A.",
    phone: "+55 21 3485-3232", fax: "", email: "maint.systems@vale.com",
    website: "www.vale.com", address: "Praia de Botafogo 186", stateRegion: "RJ",
    postalCode: "22250-145", city: "Rio de Janeiro", country: "Brazil", sector: "Mining",
    partnerId: "3", partnerName: "LATAM Industrial Group", accountManager: "Mariana Santos",
    managerOwner: "Ricardo Silva", installationLocation: "Carajás Mine Complex",
    firstInstallationDate: "2024-01-15", firstInstalledVersion: "6.1",
    currentVersion: "6.2", awardReference: "PO-LIG-2024-019", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2027-01-15", contractEndDate: "2027-01-15",
    satEndDate: "2027-01-15", backofficeUsers: 55, mobileAccesses: 180, webAccesses: 250,
    contractValue: 68000, paymentStatus: "Paid", observations: "Remote site. Satellite connectivity.",
  },
  {
    id: "c8", clientCode: "SG-APC-001", shortName: "Keppel", commercialName: "Keppel Infrastructure Pte Ltd",
    phone: "+65 6272 9988", fax: "", email: "ops.maintenance@keppel.com",
    website: "www.keppelinfra.com", address: "1 HarbourFront Ave", stateRegion: "",
    postalCode: "098632", city: "Singapore", country: "Singapore", sector: "Infrastructure",
    partnerId: "8", partnerName: "Asia Pacific CMMS Pte", accountManager: "Wei Lin Tan",
    managerOwner: "Wei Lin Tan", installationLocation: "HarbourFront Office",
    firstInstallationDate: "2023-08-01", firstInstalledVersion: "6.0",
    currentVersion: "6.2", awardReference: "PO-APC-2024-031", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "SaaS",
    status: "Active", renewalDate: "2026-08-01", contractEndDate: "2027-08-01",
    satEndDate: "2026-08-01", backofficeUsers: 35, mobileAccesses: 100, webAccesses: 150,
    contractValue: 42000, paymentStatus: "Paid", observations: "Multi-site deployment across SE Asia.",
  },
  {
    id: "c9", clientCode: "US-MFC-001", shortName: "Tyson", commercialName: "Tyson Foods Inc",
    phone: "+1 479 290 4000", fax: "", email: "facilities@tyson.com",
    website: "www.tysonfoods.com", address: "2200 W Don Tyson Pkwy", stateRegion: "Arkansas",
    postalCode: "72712", city: "Springdale", country: "United States", sector: "Food & Beverage",
    partnerId: "5", partnerName: "Midwest Facilities Corp", accountManager: "Sarah Mitchell",
    managerOwner: "Sarah Mitchell", installationLocation: "Springdale HQ",
    firstInstallationDate: "2022-09-01", firstInstalledVersion: "5.8",
    currentVersion: "6.0", awardReference: "PO-MFC-2022-003", isPremium: false,
    hasCustomReports: false, hasCustomRoutine: false, isInactive: false, autoUpdate: false,
    productType: "ManWinWin", licenseType: "Professional", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2026-02-28", contractEndDate: "2026-02-28",
    satEndDate: "2026-02-28", backofficeUsers: 10, mobileAccesses: 25, webAccesses: 40,
    contractValue: 12800, paymentStatus: "Overdue", observations: "Renewal overdue. Partner ghosting since Dec 2025.",
  },
  {
    id: "c10", clientCode: "RS-BEG-001", shortName: "NIS", commercialName: "NIS a.d. Novi Sad",
    phone: "+381 21 481 1111", fax: "", email: "odrzavanje@nis.rs",
    website: "www.nis.rs", address: "Narodnog Fronta 12", stateRegion: "Vojvodina",
    postalCode: "21000", city: "Novi Sad", country: "Serbia", sector: "Oil & Gas",
    partnerId: "7", partnerName: "Balkan Engineering d.o.o.", accountManager: "Nikola Petrović",
    managerOwner: "Nikola Petrović", installationLocation: "Pančevo Refinery",
    firstInstallationDate: "2021-11-01", firstInstalledVersion: "5.5",
    currentVersion: "5.8", awardReference: "PO-BEG-2021-001", isPremium: false,
    hasCustomReports: false, hasCustomRoutine: false, isInactive: true, autoUpdate: false,
    productType: "ManWinWin", licenseType: "UseIT", cloudOnpremise: "On-premise",
    status: "Inactive", renewalDate: "", contractEndDate: "2025-11-01",
    satEndDate: "2025-06-01", backofficeUsers: 5, mobileAccesses: 0, webAccesses: 10,
    contractValue: 5200, paymentStatus: "Overdue", observations: "Partner inactive. Client support lapsed.",
  },
  {
    id: "c11", clientCode: "MA-AFR-001", shortName: "OCP", commercialName: "OCP Group S.A.",
    phone: "+212 522 232 025", fax: "", email: "maintenance@ocpgroup.ma",
    website: "www.ocpgroup.ma", address: "Rue Al Abtal, Hay Erraha", stateRegion: "Casablanca-Settat",
    postalCode: "20200", city: "Casablanca", country: "Morocco", sector: "Mining & Chemicals",
    partnerId: "6", partnerName: "Afrique Maintenance SARL", accountManager: "Youssef Benhaddou",
    managerOwner: "Youssef Benhaddou", installationLocation: "Jorf Lasfar Complex",
    firstInstallationDate: "2024-06-01", firstInstalledVersion: "6.1",
    currentVersion: "6.2", awardReference: "PO-AFR-2024-002", isPremium: false,
    hasCustomReports: false, hasCustomRoutine: false, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "KeepIT", cloudOnpremise: "SaaS",
    status: "Active", renewalDate: "2026-06-01", contractEndDate: "2027-06-01",
    satEndDate: "2026-06-01", backofficeUsers: 12, mobileAccesses: 30, webAccesses: 45,
    contractValue: 14800, paymentStatus: "Paid", observations: "New account. Growing well.",
  },
  {
    id: "c12", clientCode: "PT-HQ-001", shortName: "EPAL", commercialName: "EPAL - Empresa Portuguesa das Águas Livres S.A.",
    phone: "+351 218 100 100", fax: "", email: "manutencao@epal.pt",
    website: "www.epal.pt", address: "Av. da Liberdade 24", stateRegion: "Lisboa",
    postalCode: "1250-144", city: "Lisbon", country: "Portugal", sector: "Water & Utilities",
    partnerId: "", partnerName: "HQ Direct", accountManager: "Carlos Mendes",
    managerOwner: "Carlos Mendes", installationLocation: "Lisbon Network Operations",
    firstInstallationDate: "2017-01-15", firstInstalledVersion: "4.5",
    currentVersion: "6.2", awardReference: "PO-HQ-2024-012", isPremium: true,
    hasCustomReports: true, hasCustomRoutine: true, isInactive: false, autoUpdate: true,
    productType: "ManWinWin", licenseType: "Business", cloudOnpremise: "On-premise",
    status: "Active", renewalDate: "2026-05-15", contractEndDate: "2027-01-15",
    satEndDate: "2026-05-15", backofficeUsers: 50, mobileAccesses: 150, webAccesses: 200,
    contractValue: 52000, paymentStatus: "Paid", observations: "HQ direct client. Long-standing relationship since 2017.",
  },
];

export const mockContacts: ClientContact[] = [
  { id: "ct1", clientId: "c1", contactName: "Miguel Rodrigues", roleFunction: "Maintenance Director", phone: "+351 217 240 100", mobile: "+351 912 345 678", email: "miguel.rodrigues@galp.com", notes: "Primary contact for CMMS" },
  { id: "ct2", clientId: "c1", contactName: "Inês Almeida", roleFunction: "IT Manager", phone: "+351 217 240 200", mobile: "+351 913 456 789", email: "ines.almeida@galp.com", notes: "Handles technical integration" },
  { id: "ct3", clientId: "c2", contactName: "Pedro Santos", roleFunction: "Facilities Manager", phone: "+351 229 416 300", mobile: "+351 914 567 890", email: "pedro.santos@sonae.pt", notes: "" },
  { id: "ct4", clientId: "c4", contactName: "Lars Andersson", roleFunction: "Plant Maintenance Manager", phone: "+46 16 541 01 50", mobile: "+46 70 123 4567", email: "lars.andersson@volvo.com", notes: "Main operational contact" },
  { id: "ct5", clientId: "c6", contactName: "Roberto Lima", roleFunction: "CMMS Project Leader", phone: "+55 21 3224 5500", mobile: "+55 21 99876 5432", email: "roberto.lima@petrobras.com.br", notes: "Key stakeholder" },
  { id: "ct6", clientId: "c8", contactName: "David Lim", roleFunction: "Operations Director", phone: "+65 6272 9900", mobile: "+65 9123 4567", email: "david.lim@keppel.com", notes: "" },
  { id: "ct7", clientId: "c12", contactName: "Teresa Martins", roleFunction: "Asset Management Head", phone: "+351 218 100 200", mobile: "+351 916 789 012", email: "teresa.martins@epal.pt", notes: "Long-term relationship manager" },
];

export const mockLicenses: License[] = [
  { id: "l1", clientId: "c1", product: "ManWinWin", version: "6.2", databaseType: "SQL Server", licenseStartDate: "2024-09-15", licenseEndDate: "2026-09-15", licenseModel: "Business", periodicity: "Annual", satActive: true, satEndDate: "2026-09-15", backofficeUsers: 45, backofficeEmployeeUsers: 200, mobileUsers: 120, webAccesses: 200, apiAccess: true },
  { id: "l2", clientId: "c2", product: "ManWinWin", version: "6.1", databaseType: "PostgreSQL", licenseStartDate: "2023-04-10", licenseEndDate: "2026-04-10", licenseModel: "Business", periodicity: "Annual", satActive: true, satEndDate: "2026-04-10", backofficeUsers: 30, backofficeEmployeeUsers: 150, mobileUsers: 85, webAccesses: 150, apiAccess: false },
  { id: "l3", clientId: "c4", product: "ManWinWin", version: "6.2", databaseType: "SQL Server", licenseStartDate: "2024-12-01", licenseEndDate: "2026-12-01", licenseModel: "Business", periodicity: "Annual", satActive: true, satEndDate: "2026-12-01", backofficeUsers: 60, backofficeEmployeeUsers: 350, mobileUsers: 200, webAccesses: 300, apiAccess: true },
  { id: "l4", clientId: "c6", product: "ManWinWin", version: "6.2", databaseType: "Oracle", licenseStartDate: "2024-06-01", licenseEndDate: "2026-06-01", licenseModel: "Business", periodicity: "Annual", satActive: true, satEndDate: "2026-06-01", backofficeUsers: 80, backofficeEmployeeUsers: 500, mobileUsers: 300, webAccesses: 500, apiAccess: true },
  { id: "l5", clientId: "c5", product: "ManWinWin", version: "6.1", databaseType: "SQL Server", licenseStartDate: "2023-03-25", licenseEndDate: "2026-03-25", licenseModel: "Professional", periodicity: "Annual", satActive: true, satEndDate: "2026-03-25", backofficeUsers: 20, backofficeEmployeeUsers: 80, mobileUsers: 50, webAccesses: 80, apiAccess: false },
  { id: "l6", clientId: "c9", product: "ManWinWin", version: "6.0", databaseType: "SQL Server", licenseStartDate: "2022-02-28", licenseEndDate: "2026-02-28", licenseModel: "Professional", periodicity: "Annual", satActive: false, satEndDate: "2026-02-28", backofficeUsers: 10, backofficeEmployeeUsers: 40, mobileUsers: 25, webAccesses: 40, apiAccess: false },
];

export const mockLicensedModules: LicensedModule[] = [
  { id: "lm1", licenseId: "l1", moduleName: "Maintenance Requests", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm2", licenseId: "l1", moduleName: "Purchase Requests", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm3", licenseId: "l1", moduleName: "Warehouse Requests", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm4", licenseId: "l1", moduleName: "Materials Management", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm5", licenseId: "l1", moduleName: "Budget Cost Control", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm6", licenseId: "l1", moduleName: "Workflow Emails", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm7", licenseId: "l1", moduleName: "Advanced Reports", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm8", licenseId: "l1", moduleName: "Maintenance Web 8.0", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm9", licenseId: "l1", moduleName: "SLA", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm10", licenseId: "l1", moduleName: "API", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-09-15", endDate: "2026-09-15", notes: "" },
  { id: "lm11", licenseId: "l1", moduleName: "Importer", enabled: false, licenseType: "", periodicity: "", startDate: "", endDate: "", notes: "" },
  { id: "lm12", licenseId: "l1", moduleName: "Workflow Approvals", enabled: false, licenseType: "", periodicity: "", startDate: "", endDate: "", notes: "" },
  { id: "lm13", licenseId: "l4", moduleName: "Maintenance Requests", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-06-01", endDate: "2026-06-01", notes: "" },
  { id: "lm14", licenseId: "l4", moduleName: "API", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-06-01", endDate: "2026-06-01", notes: "SAP Integration" },
  { id: "lm15", licenseId: "l4", moduleName: "Maintenance Web 8.0", enabled: true, licenseType: "Business", periodicity: "Annual", startDate: "2024-06-01", endDate: "2026-06-01", notes: "" },
];

export const mockContracts: Contract[] = [
  { id: "co1", clientId: "c1", priceTableReference: "PT-BUS-2024", contractStartDate: "2024-06-15", contractEndDate: "2027-06-15", noticePeriodDays: 90, contractValue: 48500, invoicedValue: 48500, numInstallments: 4, hostingValue: 0, mwwWebValue: 8500, satValue: 12000, totalValue: 48500, currency: "EUR", partnerRevenueSplit: 35, renewalIncreasePct: 3.5, renewalFreezeNotes: "", billingNotes: "Quarterly invoicing. Partner invoices directly.", observations: "3-year contract renewed in 2024. Premium SLA included. Custom reports bundle at discounted rate. Historical note: client was on Professional until 2019 upgrade." },
  { id: "co2", clientId: "c2", priceTableReference: "PT-BUS-2023", contractStartDate: "2023-01-01", contractEndDate: "2026-12-31", noticePeriodDays: 60, contractValue: 36200, invoicedValue: 36200, numInstallments: 2, hostingValue: 4800, mwwWebValue: 6200, satValue: 9000, totalValue: 36200, currency: "EUR", partnerRevenueSplit: 30, renewalIncreasePct: 2.5, renewalFreezeNotes: "Price frozen for 2024 per commercial agreement", billingNotes: "Semi-annual. HQ invoices, partner receives commission.", observations: "Multi-site. Hosting managed by HQ. Backup server at partner DC. Renewal price frozen until end 2024 per negotiation with Pedro Santos." },
  { id: "co3", clientId: "c6", priceTableReference: "PT-BUS-2024-BR", contractStartDate: "2024-06-01", contractEndDate: "2027-06-01", noticePeriodDays: 60, contractValue: 95000, invoicedValue: 47500, numInstallments: 4, hostingValue: 0, mwwWebValue: 15000, satValue: 22000, totalValue: 95000, currency: "USD", partnerRevenueSplit: 40, renewalIncreasePct: 4.0, renewalFreezeNotes: "", billingNotes: "USD billing. Quarterly. Partner handles local invoicing in BRL equivalent.", observations: "Largest single contract. Custom API integration project ongoing. Separate SOW for SCADA integration phase 2 expected Q3 2026." },
];

export const mockPayments: Payment[] = [
  { id: "p1", clientId: "c1", paymentStatus: "Paid", invoiceNumber: "INV-2026-001", invoiceDate: "2026-01-15", dueDate: "2026-02-15", amountDue: 12125, amountPaid: 12125, outstandingBalance: 0, lastPaymentDate: "2026-02-10", billingNotes: "Q1 2026 installment" },
  { id: "p2", clientId: "c2", paymentStatus: "Paid", invoiceNumber: "INV-2026-018", invoiceDate: "2026-01-01", dueDate: "2026-01-31", amountDue: 18100, amountPaid: 18100, outstandingBalance: 0, lastPaymentDate: "2026-01-28", billingNotes: "H1 2026" },
  { id: "p3", clientId: "c5", paymentStatus: "Pending", invoiceNumber: "INV-2026-042", invoiceDate: "2026-03-01", dueDate: "2026-03-31", amountDue: 24500, amountPaid: 0, outstandingBalance: 24500, lastPaymentDate: "", billingNotes: "Annual renewal" },
  { id: "p4", clientId: "c9", paymentStatus: "Overdue", invoiceNumber: "INV-2025-198", invoiceDate: "2025-12-01", dueDate: "2025-12-31", amountDue: 12800, amountPaid: 0, outstandingBalance: 12800, lastPaymentDate: "", billingNotes: "Annual renewal. Partner not responding." },
  { id: "p5", clientId: "c6", paymentStatus: "Paid", invoiceNumber: "INV-2026-055", invoiceDate: "2026-03-01", dueDate: "2026-03-31", amountDue: 23750, amountPaid: 23750, outstandingBalance: 0, lastPaymentDate: "2026-03-15", billingNotes: "Q1 2026 USD billing" },
];

export const mockNotes: ClientNote[] = [
  { id: "n1", clientId: "c1", noteType: "operational", content: "Completed v6.2 upgrade successfully on March 5, 2026. No downtime reported. All 45 backoffice users migrated.", createdBy: "Ana Costa", createdAt: "2026-03-05T14:30:00Z" },
  { id: "n2", clientId: "c1", noteType: "support", content: "Client requested additional mobile licenses for field technicians. Quote sent for 30 additional mobile accesses.", createdBy: "João Ferreira", createdAt: "2026-03-12T09:15:00Z" },
  { id: "n3", clientId: "c2", noteType: "general", content: "Renewal discussion scheduled for April 1. Pedro Santos confirmed budget approval for continuation.", createdBy: "Ana Costa", createdAt: "2026-03-18T11:00:00Z" },
  { id: "n4", clientId: "c9", noteType: "warning", content: "⚠️ Partner Midwest Facilities Corp has been unresponsive since December 2025. Client Tyson renewal overdue. Escalation to Carlos Mendes.", createdBy: "System", createdAt: "2026-02-15T08:00:00Z" },
  { id: "n5", clientId: "c6", noteType: "implementation", content: "SCADA integration Phase 1 completed. Phase 2 SOW being drafted for Q3 2026.", createdBy: "Ricardo Silva", createdAt: "2026-03-10T16:45:00Z" },
];

export const mockCredentials: ClientCredential[] = [
  { id: "cr1", clientId: "c1", systemUrl: "https://mww.galp.internal:8443", login: "admin_galp", username: "mww_admin", passwordSecret: "••••••••••••", environmentType: "Production", adminNotes: "VPN required. Contact IT for access." },
  { id: "cr2", clientId: "c4", systemUrl: "https://mww.volvo-gothenburg.local/app", login: "volvo_admin", username: "mww_sysadmin", passwordSecret: "••••••••••••", environmentType: "Production", adminNotes: "SAP SSO integration active." },
  { id: "cr3", clientId: "c12", systemUrl: "https://cmms.epal.pt", login: "epal_admin", username: "admin", passwordSecret: "••••••••••••", environmentType: "Production", adminNotes: "Direct HQ managed. Public URL with IP whitelist." },
];

// Summary stats
export function getClientStats(clients: ClientRecord[]) {
  const active = clients.filter(c => c.status === "Active").length;
  const premium = clients.filter(c => c.isPremium).length;
  const totalValue = clients.reduce((s, c) => s + c.contractValue, 0);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const renewals30 = clients.filter(c => {
    if (!c.renewalDate || c.isInactive) return false;
    const d = new Date(c.renewalDate);
    return d >= now && d <= in30;
  }).length;

  const renewals60 = clients.filter(c => {
    if (!c.renewalDate || c.isInactive) return false;
    const d = new Date(c.renewalDate);
    return d >= now && d <= in60;
  }).length;

  const renewals90 = clients.filter(c => {
    if (!c.renewalDate || c.isInactive) return false;
    const d = new Date(c.renewalDate);
    return d >= now && d <= in90;
  }).length;

  const overdue = clients.filter(c => {
    if (!c.renewalDate || c.isInactive) return false;
    return new Date(c.renewalDate) < now;
  }).length;

  return { active, premium, totalValue, renewals30, renewals60, renewals90, overdue, total: clients.length };
}
