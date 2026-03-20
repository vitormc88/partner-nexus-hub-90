import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Building2, Users, FileText, Eye, KeyRound, IdCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { RenewalBadge } from "@/components/clients/RenewalBadge";
import {
  mockClients, mockContacts, mockLicenses, mockLicensedModules,
  mockContracts, mockPayments, mockNotes, mockCredentials,
  getRenewalStatus, partnerRenewalSettings, defaultRenewalSettings,
} from "@/data/clients-mock-data";

function FieldRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-40 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = mockClients.find(c => c.id === id);

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-muted-foreground">Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clients")}>Back to Clients</Button>
      </div>
    );
  }

  const contacts = mockContacts.filter(c => c.clientId === id);
  const licenses = mockLicenses.filter(l => l.clientId === id);
  const contracts = mockContracts.filter(c => c.clientId === id);
  const payments = mockPayments.filter(p => p.clientId === id);
  const notes = mockNotes.filter(n => n.clientId === id);
  const credentials = mockCredentials.filter(c => c.clientId === id);
  const modules = licenses.length > 0 ? mockLicensedModules.filter(m => licenses.some(l => l.id === m.licenseId)) : [];

  const settings = partnerRenewalSettings.find(s => s.partnerId === client.partnerId) || defaultRenewalSettings;
  const renewalStatus = getRenewalStatus(client.renewalDate || null, client.isInactive, settings);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      {/* Header */}
      <div className="animate-reveal-up flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{client.commercialName}</h1>
              {client.isPremium && (
                <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-50 gap-1">
                  <Star className="h-3 w-3" /> Premium
                </Badge>
              )}
              <RenewalBadge status={renewalStatus} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{client.clientCode}</span>
              <span>•</span>
              {client.partnerId ? (
                <Link to={`/partners/${client.partnerId}`} className="hover:text-primary transition-colors underline underline-offset-2">
                  {client.partnerName}
                </Link>
              ) : (
                <span>{client.partnerName}</span>
              )}
              <span>•</span>
              <span>{client.country}</span>
            </div>
          </div>
        </div>
        <Badge variant={client.status === "Active" ? "default" : "secondary"}>
          {client.status}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="client" className="animate-reveal-up" style={{ animationDelay: "80ms" }}>
        <TabsList className="grid w-full grid-cols-6 h-10">
          <TabsTrigger value="client" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Client</TabsTrigger>
          <TabsTrigger value="identification" className="gap-1.5 text-xs"><IdCard className="h-3.5 w-3.5" /> Identification</TabsTrigger>
          <TabsTrigger value="licensing" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Licensing</TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" /> Contract</TabsTrigger>
          <TabsTrigger value="observations" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Observations</TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1.5 text-xs"><KeyRound className="h-3.5 w-3.5" /> Credentials</TabsTrigger>
        </TabsList>

        {/* TAB 1: Client */}
        <TabsContent value="client" className="space-y-5 mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <FieldRow label="Client Code" value={client.clientCode} mono />
                <FieldRow label="Short Name" value={client.shortName} />
                <FieldRow label="Commercial Name" value={client.commercialName} />
                <FieldRow label="Phone" value={client.phone} />
                <FieldRow label="Fax" value={client.fax} />
                <FieldRow label="Email" value={client.email} />
                <FieldRow label="Website" value={client.website} />
                <FieldRow label="Address" value={client.address} />
                <FieldRow label="City" value={client.city} />
                <FieldRow label="Postal Code" value={client.postalCode} />
                <FieldRow label="State / Region" value={client.stateRegion} />
                <FieldRow label="Country" value={client.country} />
                <FieldRow label="Sector" value={client.sector} />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Contacts ({contacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No contacts registered</p>
                ) : (
                  <div className="space-y-3">
                    {contacts.map(ct => (
                      <div key={ct.id} className="rounded-lg border border-border/60 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{ct.contactName}</span>
                          <span className="text-xs text-muted-foreground">{ct.roleFunction}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {ct.phone && <span>📞 {ct.phone}</span>}
                          {ct.mobile && <span>📱 {ct.mobile}</span>}
                          {ct.email && <span>✉️ {ct.email}</span>}
                        </div>
                        {ct.notes && <p className="text-xs text-muted-foreground italic">{ct.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Identification */}
        <TabsContent value="identification" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Management</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                <FieldRow label="Manager / Owner" value={client.managerOwner} />
                <FieldRow label="Account Manager" value={client.accountManager} />
                <FieldRow label="Linked Partner" value={
                  client.partnerId ? (
                    <Link to={`/partners/${client.partnerId}`} className="text-primary hover:underline">{client.partnerName}</Link>
                  ) : client.partnerName
                } />
                <FieldRow label="Installation Location" value={client.installationLocation} />
                <FieldRow label="First Installation" value={client.firstInstallationDate} />
                <FieldRow label="First Version" value={client.firstInstalledVersion} />
                <FieldRow label="Current Version" value={client.currentVersion} />
                <FieldRow label="Renewal Date" value={client.renewalDate} />
                <FieldRow label="Award / PO Reference" value={client.awardReference} mono />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Flags & Settings</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Premium Client", checked: client.isPremium },
                  { label: "Custom Reports", checked: client.hasCustomReports },
                  { label: "Custom Routine", checked: client.hasCustomRoutine },
                  { label: "Inactive", checked: client.isInactive },
                  { label: "Auto Update", checked: client.autoUpdate },
                ].map(flag => (
                  <div key={flag.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                    <span className="text-sm text-foreground">{flag.label}</span>
                    <Switch checked={flag.checked} disabled />
                  </div>
                ))}
                <div className="pt-3">
                  <span className="text-xs text-muted-foreground block mb-1">Deployment</span>
                  <Badge variant="secondary">{client.cloudOnpremise}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Licensing */}
        <TabsContent value="licensing" className="space-y-5 mt-5">
          {licenses.length === 0 ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                No license records found for this client.
              </CardContent>
            </Card>
          ) : licenses.map(lic => (
            <Card key={lic.id} className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {lic.product} — {lic.licenseModel}
                  <Badge variant="secondary" className="text-xs">{lic.version}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div className="space-y-0">
                    <FieldRow label="Database Type" value={lic.databaseType} />
                    <FieldRow label="License Start" value={lic.licenseStartDate} />
                    <FieldRow label="License End" value={lic.licenseEndDate} />
                    <FieldRow label="Model" value={lic.licenseModel} />
                    <FieldRow label="Periodicity" value={lic.periodicity} />
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="SAT Active" value={lic.satActive ? "Yes" : "No"} />
                    <FieldRow label="SAT End Date" value={lic.satEndDate} />
                    <FieldRow label="BackOffice Users" value={lic.backofficeUsers} />
                    <FieldRow label="Employee Users" value={lic.backofficeEmployeeUsers} />
                    <FieldRow label="Mobile Users" value={lic.mobileUsers} />
                    <FieldRow label="Web Accesses" value={lic.webAccesses} />
                    <FieldRow label="API Access" value={lic.apiAccess ? "Yes" : "No"} />
                  </div>
                </div>

                {/* Licensed Modules */}
                {modules.filter(m => m.licenseId === lic.id).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Licensed Modules</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Module</TableHead>
                          <TableHead className="text-xs">Enabled</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Period</TableHead>
                          <TableHead className="text-xs">Start</TableHead>
                          <TableHead className="text-xs">End</TableHead>
                          <TableHead className="text-xs">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modules.filter(m => m.licenseId === lic.id).map(mod => (
                          <TableRow key={mod.id}>
                            <TableCell className="text-sm font-medium">{mod.moduleName}</TableCell>
                            <TableCell>
                              <Switch checked={mod.enabled} disabled className="scale-75" />
                            </TableCell>
                            <TableCell className="text-xs">{mod.licenseType || "—"}</TableCell>
                            <TableCell className="text-xs">{mod.periodicity || "—"}</TableCell>
                            <TableCell className="text-xs tabular-nums">{mod.startDate || "—"}</TableCell>
                            <TableCell className="text-xs tabular-nums">{mod.endDate || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{mod.notes || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 4: Contract */}
        <TabsContent value="contract" className="space-y-5 mt-5">
          {contracts.length === 0 ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">No contract records found.</CardContent>
            </Card>
          ) : contracts.map(co => (
            <Card key={co.id} className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Contract — {co.contractStartDate} to {co.contractEndDate}
                  <Badge variant="secondary" className="ml-2 text-xs">{co.currency}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div className="space-y-0">
                    <FieldRow label="Price Table" value={co.priceTableReference} mono />
                    <FieldRow label="Start Date" value={co.contractStartDate} />
                    <FieldRow label="End Date" value={co.contractEndDate} />
                    <FieldRow label="Notice Period" value={`${co.noticePeriodDays} days`} />
                    <FieldRow label="Installments" value={co.numInstallments} />
                    <FieldRow label="Renewal Increase" value={co.renewalIncreasePct ? `${co.renewalIncreasePct}%` : "—"} />
                    <FieldRow label="Partner Split" value={co.partnerRevenueSplit ? `${co.partnerRevenueSplit}%` : "—"} />
                  </div>
                  <div className="space-y-0">
                    <FieldRow label="Contract Value" value={`${co.currency} ${co.contractValue?.toLocaleString()}`} />
                    <FieldRow label="Invoiced Value" value={`${co.currency} ${co.invoicedValue?.toLocaleString()}`} />
                    <FieldRow label="Hosting Value" value={co.hostingValue ? `${co.currency} ${co.hostingValue.toLocaleString()}` : "—"} />
                    <FieldRow label="MWW Web Value" value={co.mwwWebValue ? `${co.currency} ${co.mwwWebValue.toLocaleString()}` : "—"} />
                    <FieldRow label="SAT Value" value={co.satValue ? `${co.currency} ${co.satValue.toLocaleString()}` : "—"} />
                    <FieldRow label="Total Value" value={<span className="font-semibold">{co.currency} {co.totalValue?.toLocaleString()}</span>} />
                  </div>
                </div>

                {co.renewalFreezeNotes && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">Renewal Freeze Note</p>
                    <p className="text-sm text-amber-900">{co.renewalFreezeNotes}</p>
                  </div>
                )}

                {co.billingNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Billing Notes</p>
                    <p className="text-sm text-foreground">{co.billingNotes}</p>
                  </div>
                )}

                {co.observations && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Contract Notes & History</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{co.observations}</p>
                  </div>
                )}

                {/* Payments */}
                {payments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment History</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Invoice #</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Due</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Paid</TableHead>
                          <TableHead className="text-xs">Balance</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(pay => (
                          <TableRow key={pay.id}>
                            <TableCell className="font-mono text-xs">{pay.invoiceNumber}</TableCell>
                            <TableCell className="text-xs tabular-nums">{pay.invoiceDate}</TableCell>
                            <TableCell className="text-xs tabular-nums">{pay.dueDate}</TableCell>
                            <TableCell className="text-xs tabular-nums">€{pay.amountDue?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs tabular-nums">€{pay.amountPaid?.toLocaleString()}</TableCell>
                            <TableCell className="text-xs tabular-nums">€{pay.outstandingBalance?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={pay.paymentStatus === "Paid" ? "default" : pay.paymentStatus === "Overdue" ? "destructive" : "secondary"} className="text-xs">
                                {pay.paymentStatus}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 5: Observations */}
        <TabsContent value="observations" className="mt-5">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notes & Observations ({notes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No notes recorded.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => {
                    const typeColors: Record<string, string> = {
                      operational: "bg-blue-50 text-blue-700 border-blue-200",
                      support: "bg-purple-50 text-purple-700 border-purple-200",
                      warning: "bg-red-50 text-red-700 border-red-200",
                      implementation: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      general: "bg-muted text-muted-foreground border-border",
                    };
                    return (
                      <div key={note.id} className="rounded-lg border border-border/60 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className={`text-[10px] ${typeColors[note.noteType] || typeColors.general}`}>
                            {note.noteType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(note.createdAt).toLocaleDateString()} — {note.createdBy}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {client.observations && (
            <Card className="border-border/60 shadow-sm mt-5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">General Observations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{client.observations}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 6: Credentials */}
        <TabsContent value="credentials" className="mt-5">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm font-semibold">System Credentials</CardTitle>
                <Badge variant="destructive" className="text-[10px]">Restricted Access</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No credentials stored.</p>
              ) : (
                <div className="space-y-4">
                  {credentials.map(cred => (
                    <div key={cred.id} className="rounded-lg border border-border/60 p-4 space-y-0">
                      <FieldRow label="System URL" value={cred.systemUrl} mono />
                      <FieldRow label="Login" value={cred.login} mono />
                      <FieldRow label="Username" value={cred.username} mono />
                      <FieldRow label="Password" value={cred.passwordSecret} />
                      <FieldRow label="Environment" value={
                        <Badge variant="secondary" className="text-xs">{cred.environmentType}</Badge>
                      } />
                      {cred.adminNotes && <FieldRow label="Admin Notes" value={cred.adminNotes} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
