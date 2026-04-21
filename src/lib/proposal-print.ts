import type { Proposal, ProposalItem } from "@/types/proposal";
import { formatEuro, t } from "./proposal-i18n";

/**
 * Open a print-friendly window with the proposal rendered as HTML.
 * Users use the browser's "Save as PDF" to export.
 */
export function printProposal(proposal: Proposal, items: ProposalItem[]) {
  const lang = proposal.language as any;
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;

  const software = items.filter((i) => i.category === "software");
  const services = items.filter((i) => i.category === "service");
  const custom = items.filter((i) => i.category === "custom");

  const row = (it: ProposalItem) => `
    <tr>
      <td>${escape(it.item_name)}${it.description ? `<br/><span class="muted">${escape(it.description)}</span>` : ""}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${formatEuro(Number(it.unit_price) || 0, lang)}</td>
      <td class="num">${formatEuro(Number(it.total) || 0, lang)}</td>
      <td>${it.frequency}</td>
    </tr>`;

  const section = (title: string, list: ProposalItem[]) =>
    list.length === 0
      ? ""
      : `
      <h2>${escape(title)}</h2>
      <table>
        <thead>
          <tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th><th>Frequency</th></tr>
        </thead>
        <tbody>${list.map(row).join("")}</tbody>
      </table>`;

  const html = `<!doctype html>
<html lang="${lang.toLowerCase()}">
<head>
<meta charset="utf-8" />
<title>Proposal ${escape(proposal.client_name)} v${proposal.version}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.45; }
  .cover { padding: 60px 0 30px; border-bottom: 4px solid #c00; margin-bottom: 24px; }
  .cover h1 { font-size: 26pt; margin: 0 0 8px; color: #1a1a1a; }
  .cover .sub { color: #666; font-size: 12pt; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0 24px; font-size: 10.5pt; }
  .meta .k { color: #666; }
  .restricted { color: #c00; font-weight: 600; font-size: 9pt; letter-spacing: 0.5px; text-transform: uppercase; }
  h2 { font-size: 13pt; color: #c00; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 22px 0 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10pt; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
  th { background: #f6f6f6; font-weight: 600; font-size: 9.5pt; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .muted { color: #888; font-size: 9pt; }
  .summary { margin-top: 18px; border: 1px solid #ddd; border-radius: 4px; padding: 12px 16px; background: #fafafa; }
  .summary .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11pt; }
  .summary .total { font-weight: 700; font-size: 13pt; color: #c00; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 6px; }
  .terms { margin-top: 24px; font-size: 10pt; }
  .terms p { margin: 6px 0; }
  .footer { margin-top: 40px; text-align: center; color: #999; font-size: 9pt; }
  @media print { .noprint { display: none !important; } }
  .noprint { position: fixed; top: 12px; right: 12px; background: #c00; color: #fff; padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; border: 0; }
</style>
</head>
<body>
  <button class="noprint" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="cover">
    <div class="restricted">Restricted Information</div>
    <h1>${escape(t(lang, "investmentQuoteTitle"))}</h1>
    <div class="sub">${escape(t(lang, "professionalPlan"))} ${proposal.plan} — ${escape(proposal.hosting)}</div>
  </div>

  <div class="meta">
    <div><span class="k">${escape(t(lang, "client"))}:</span> <strong>${escape(proposal.client_name)}</strong></div>
    <div><span class="k">${escape(t(lang, "date"))}:</span> ${formatDate(proposal.proposal_date, lang)}</div>
    <div><span class="k">${escape(t(lang, "project"))}:</span> ${escape(proposal.project_name || "—")}</div>
    <div><span class="k">${escape(t(lang, "validity"))}:</span> ${proposal.validity_days} ${escape(t(lang, "days"))}</div>
    <div><span class="k">${escape(t(lang, "country"))}:</span> ${escape(proposal.country || "—")}</div>
    <div><span class="k">${escape(t(lang, "version"))}:</span> v${proposal.version}</div>
  </div>

  ${section(t(lang, "software"), software)}
  ${section(t(lang, "services"), services)}
  ${custom.length ? section(t(lang, "additionalItems"), custom) : ""}

  <div class="summary">
    <div class="row"><span>${escape(t(lang, "softwareSubtotal"))}</span><span>${formatEuro(Number(proposal.software_subtotal) || 0, lang)}</span></div>
    <div class="row"><span>${escape(t(lang, "servicesSubtotal"))}</span><span>${formatEuro(Number(proposal.services_subtotal) || 0, lang)}</span></div>
    ${Number(proposal.discount_amount) > 0 ? `<div class="row"><span>${escape(t(lang, "discount"))} (${proposal.discount_pct}%)</span><span>− ${formatEuro(Number(proposal.discount_amount) || 0, lang)}</span></div>` : ""}
    <div class="row total"><span>${escape(t(lang, "totalYear1"))}</span><span>${formatEuro(Number(proposal.total_year_1) || 0, lang)}</span></div>
    <div class="row"><span>${escape(t(lang, "recurringYearly"))}</span><span>${formatEuro(Number(proposal.total_recurring) || 0, lang)} / ${escape(t(lang, "year"))}</span></div>
  </div>

  <div class="terms">
    <h2>${escape(t(lang, "paymentTerms"))}</h2>
    <p>${escape(proposal.payment_terms || "")}</p>
    ${proposal.notes ? `<h2>${escape(t(lang, "notes"))}</h2><p>${escape(proposal.notes)}</p>` : ""}
  </div>

  <div class="footer">ManWinWin Software · ${escape(proposal.client_name)} · v${proposal.version}</div>

  <script>setTimeout(() => window.print(), 600);</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escape(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    const locale = lang === "PT" ? "pt-PT" : lang === "ES" ? "es-ES" : "en-GB";
    return d.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}
