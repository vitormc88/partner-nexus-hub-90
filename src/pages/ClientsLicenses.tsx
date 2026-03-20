import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Download, Plus, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientsKPIBar } from "@/components/clients/ClientsKPIBar";
import { RenewalBadge } from "@/components/clients/RenewalBadge";
import {
  mockClients, getClientStats, getRenewalStatus,
  partnerRenewalSettings, defaultRenewalSettings,
} from "@/data/clients-mock-data";
import { partners } from "@/data/mock-data";

export default function ClientsLicenses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renewalFilter, setRenewalFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("commercialName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let list = [...mockClients];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.commercialName.toLowerCase().includes(q) ||
        c.clientCode.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
      );
    }

    if (partnerFilter !== "all") {
      list = list.filter(c => c.partnerId === partnerFilter || (partnerFilter === "hq" && !c.partnerId));
    }

    if (statusFilter !== "all") {
      list = list.filter(c => c.status === statusFilter);
    }

    if (renewalFilter !== "all") {
      list = list.filter(c => {
        const settings = partnerRenewalSettings.find(s => s.partnerId === c.partnerId) || defaultRenewalSettings;
        const rs = getRenewalStatus(c.renewalDate || null, c.isInactive, settings);
        return rs === renewalFilter;
      });
    }

    list.sort((a, b) => {
      let av: any = (a as any)[sortField];
      let bv: any = (b as any)[sortField];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [search, partnerFilter, statusFilter, renewalFilter, sortField, sortDir]);

  const stats = getClientStats(filtered);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <ChevronDown className={`h-3 w-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
        )}
      </span>
    </TableHead>
  );

  const handleExport = () => {
    const headers = ["Client Code", "Client Name", "Partner", "Country", "Sector", "License Type", "Version", "BO Users", "Mobile", "Web", "Renewal Date", "Contract Value", "Status", "Payment"];
    const rows = filtered.map(c => [
      c.clientCode, c.commercialName, c.partnerName, c.country, c.sector,
      c.licenseType, c.currentVersion, c.backofficeUsers, c.mobileAccesses,
      c.webAccesses, c.renewalDate, c.contractValue, c.status, c.paymentStatus,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients-licenses-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="animate-reveal-up flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Clients & Licenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Centralized license management across all partners</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Client
          </Button>
        </div>
      </div>

      <div className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
        <ClientsKPIBar
          active={stats.active}
          total={stats.total}
          premium={stats.premium}
          totalValue={stats.totalValue}
          renewals30={stats.renewals30}
          overdue={stats.overdue}
        />
      </div>

      <div className="animate-reveal-up flex flex-wrap items-center gap-3" style={{ animationDelay: "120ms" }}>
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Partners</SelectItem>
            <SelectItem value="hq">HQ Direct</SelectItem>
            {partners.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={renewalFilter} onValueChange={setRenewalFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Renewal Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Renewals</SelectItem>
            <SelectItem value="green">Safe</SelectItem>
            <SelectItem value="yellow">Approaching</SelectItem>
            <SelectItem value="orange">Urgent</SelectItem>
            <SelectItem value="red">Overdue</SelectItem>
            <SelectItem value="grey">N/A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="animate-reveal-up rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden" style={{ animationDelay: "180ms" }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortHeader field="clientCode">Code</SortHeader>
                <SortHeader field="commercialName">Client</SortHeader>
                <SortHeader field="partnerName">Partner</SortHeader>
                <SortHeader field="country">Country</SortHeader>
                <SortHeader field="sector">Sector</SortHeader>
                <SortHeader field="licenseType">License</SortHeader>
                <SortHeader field="currentVersion">Ver</SortHeader>
                <SortHeader field="backofficeUsers">BO</SortHeader>
                <SortHeader field="mobileAccesses">Mob</SortHeader>
                <SortHeader field="renewalDate">Renewal</SortHeader>
                <TableHead>Alert</TableHead>
                <SortHeader field="contractValue">Value</SortHeader>
                <SortHeader field="paymentStatus">Payment</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const settings = partnerRenewalSettings.find(s => s.partnerId === c.partnerId) || defaultRenewalSettings;
                const renewal = getRenewalStatus(c.renewalDate || null, c.isInactive, settings);

                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate(`/clients/${c.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.clientCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <span className="font-medium text-foreground">{c.shortName || c.commercialName}</span>
                        {c.isPremium && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{c.commercialName}</span>
                    </TableCell>
                    <TableCell className="text-sm">{c.partnerName}</TableCell>
                    <TableCell className="text-sm">{c.country}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.sector}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {c.licenseType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{c.currentVersion}</TableCell>
                    <TableCell className="text-xs tabular-nums text-center">{c.backofficeUsers}</TableCell>
                    <TableCell className="text-xs tabular-nums text-center">{c.mobileAccesses}</TableCell>
                    <TableCell className="text-xs tabular-nums">{c.renewalDate || "—"}</TableCell>
                    <TableCell><RenewalBadge status={renewal} /></TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      €{c.contractValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.paymentStatus === "Paid" ? "default" : c.paymentStatus === "Overdue" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {c.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="h-32 text-center text-muted-foreground">
                    No clients match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
          Showing {filtered.length} of {mockClients.length} clients
        </div>
      </div>
    </div>
  );
}
