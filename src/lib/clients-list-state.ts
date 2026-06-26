// Session-scoped persistence for the Clients & Licenses list,
// so the Client Detail page can act as a continuous workspace
// (prev/next navigation, contextual position, scroll restoration).

export type FilterChip = { key: string; label: string };

export type ClientsListState = {
  search: string;
  partnerFilter: string; // "all" | "hq" | partnerId
  statusFilter: string;  // "all" | "Active" | "Inactive"
  sortField: string;
  sortDir: "asc" | "desc";
  showArchived: boolean;
  scrollY: number;
  orderedIds: string[];
  filterChips: FilterChip[];
};

const KEY = "clients:listState";

export function loadClientsListState(): Partial<ClientsListState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<ClientsListState>) : null;
  } catch {
    return null;
  }
}

export function saveClientsListState(patch: Partial<ClientsListState>) {
  if (typeof window === "undefined") return;
  try {
    const prev = loadClientsListState() ?? {};
    sessionStorage.setItem(KEY, JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* noop */
  }
}
