// PDF Generator utility - generates printable HTML documents
// Supports: A4 PDF (approvisionnement, sorties) and thermal receipt (58mm/80mm)

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  currency: string;
  tvaRate: string;
}

// ============================================
// THERMAL RECEIPT (58mm/80mm) - Sales Invoice
// ============================================
export function generateThermalReceipt(data: {
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  items: { name: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  totalPaid: number;
  change: number;
  paymentMethod: string;
  waiterName?: string;
  cashierName?: string;
  tableName?: string;
  clientName?: string;
  company: CompanyInfo;
}): string {
  const paymentLabels: Record<string, string> = {
    cash: "Especes",
    mobile_money: "Mobile Money",
    card: "Carte",
    mixed: "Mixte",
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket ${data.invoiceNumber}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; color: #000; background: #fff; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .double-line { border-top: 2px solid #000; margin: 4px 0; }
  .logo-name { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
  .sub { font-size: 10px; color: #333; }
  .item-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .item-name { flex: 1; }
  .item-qty { width: 30px; text-align: center; }
  .item-price { width: 65px; text-align: right; }
  .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 13px; }
  .grand-total { font-size: 16px; font-weight: bold; }
  .footer { font-size: 9px; color: #666; margin-top: 8px; }
  @media print {
    body { width: 80mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="center">
    <img
      src="/images/eclipse-logo-dark.png"
      alt="Eclipse Lunch Bar"
      style="width:80px;height:auto;"
    />
    <div class="logo-name">${data.company.name}</div>
    <div class="sub">${data.company.address || ""}</div>
    <div class="sub">${data.company.phone ? "Tel: " + data.company.phone : ""}</div>
  </div>
  <div class="line"></div>
  <div class="center sub">
    <div>FACTURE: <span class="bold">${data.invoiceNumber}</span></div>
    <div>Commande: ${data.orderNumber}</div>
    <div>${data.date}</div>
  </div>
  <div class="line"></div>
  ${data.tableName ? `<div class="sub">Table: ${data.tableName}</div>` : ""}
  ${data.clientName ? `<div class="sub">Client: ${data.clientName}</div>` : ""}
  ${data.waiterName ? `<div class="sub">Serveur(se): ${data.waiterName}</div>` : ""}
  <div class="line"></div>
  <div class="item-row bold sub">
    <span class="item-name">Article</span>
    <span class="item-qty">Qte</span>
    <span class="item-price">Total</span>
  </div>
  <div class="line"></div>
  ${data.items
    .map(
      (item) => `
  <div class="item-row">
    <span class="item-name">${item.name}</span>
    <span class="item-qty">${item.qty}</span>
    <span class="item-price">${item.total.toLocaleString("fr-FR")}</span>
  </div>
  <div class="sub" style="padding-left:4px">${item.qty} x ${item.unitPrice.toLocaleString("fr-FR")} ${data.company.currency}</div>`,
    )
    .join("")}
  <div class="double-line"></div>
  <div class="total-row">
    <span>Sous-total</span>
    <span>${data.subtotal.toLocaleString("fr-FR")} ${data.company.currency}</span>
  </div>
  <div class="total-row">
    <span>TVA (${data.company.tvaRate}%)</span>
    <span>${data.taxAmount.toLocaleString("fr-FR")} ${data.company.currency}</span>
  </div>
  <div class="double-line"></div>
  <div class="total-row grand-total">
    <span>TOTAL</span>
    <span>${data.total.toLocaleString("fr-FR")} ${data.company.currency}</span>
  </div>
  <div class="line"></div>
  <div class="total-row">
    <span>Paye (${paymentLabels[data.paymentMethod] || data.paymentMethod})</span>
    <span>${data.totalPaid.toLocaleString("fr-FR")} ${data.company.currency}</span>
  </div>
  ${data.change > 0 ? `<div class="total-row"><span>Monnaie</span><span>${data.change.toLocaleString("fr-FR")} ${data.company.currency}</span></div>` : ""}
  <div class="line"></div>
  ${data.cashierName ? `<div class="sub">Caissier(e): ${data.cashierName}</div>` : ""}
  <div class="footer center">
    <div>Merci de votre visite!</div>
    <div>${data.company.name}</div>
  </div>
  <div class="no-print center" style="margin-top:12px">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#d4920a;color:#000;border:none;border-radius:4px;">Imprimer</button>
  </div>
</body>
</html>`;
}

// ============================================
// A4 PDF - Approvisionnement (Supply Entry)
// ============================================
export function generateEntryPDF(data: {
  reference: string;
  date: string;
  productName: string;
  supplierName: string;
  quantityCartons: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  createdBy: string;
  company: CompanyInfo;
}): string {
  return generateA4Document({
    title: "BON D'APPROVISIONNEMENT",
    reference: data.reference,
    date: data.date,
    company: data.company,
    createdBy: data.createdBy,
    details: [
      { label: "Produit", value: data.productName },
      { label: "Fournisseur", value: data.supplierName || "-" },
      { label: "Quantite", value: `${data.quantityCartons} carton(s)` },
      {
        label: "Cout unitaire",
        value: `${data.unitCost.toLocaleString("fr-FR")} ${data.company.currency}`,
      },
    ],
    totalLabel: "COUT TOTAL",
    totalValue: `${data.totalCost.toLocaleString("fr-FR")} ${data.company.currency}`,
    notes: data.notes,
  });
}

// ============================================
// A4 PDF - Sortie vers POS (Stock Exit)
// ============================================
export function generateExitPDF(data: {
  reference: string;
  date: string;
  productName: string;
  posName: string;
  quantityCartons: number;
  quantityUnits: number;
  notes?: string;
  createdBy: string;
  company: CompanyInfo;
}): string {
  return generateA4Document({
    title: "BON DE SORTIE DE STOCK",
    reference: data.reference,
    date: data.date,
    company: data.company,
    createdBy: data.createdBy,
    details: [
      { label: "Produit", value: data.productName },
      { label: "Destination (POS)", value: data.posName },
      { label: "Quantite cartons", value: `${data.quantityCartons}` },
      { label: "Quantite unites", value: `${data.quantityUnits}` },
    ],
    notes: data.notes,
  });
}

// ============================================
// A4 PDF - Cash Withdrawal
// ============================================
export function generateWithdrawalPDF(data: {
  reference: string;
  date: string;
  amount: number;
  reason: string;
  posName: string;
  createdBy: string;
  company: CompanyInfo;
}): string {
  return generateA4Document({
    title: "BON DE RETRAIT DE CAISSE",
    reference: data.reference,
    date: data.date,
    company: data.company,
    createdBy: data.createdBy,
    details: [
      { label: "Point de vente", value: data.posName },
      { label: "Motif", value: data.reason },
    ],
    totalLabel: "MONTANT RETIRE",
    totalValue: `${data.amount.toLocaleString("fr-FR")} ${data.company.currency}`,
  });
}

// ============================================
// Generic A4 Document
// ============================================
function generateA4Document(data: {
  title: string;
  reference: string;
  date: string;
  company: CompanyInfo;
  createdBy: string;
  details: { label: string; value: string }[];
  totalLabel?: string;
  totalValue?: string;
  notes?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${data.title} - ${data.reference}</title>
<style>
  @page { margin: 20mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #d4920a; }
  .company-name { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: 0.5px; }
  .company-sub { font-size: 11px; color: #666; margin-top: 4px; }
  .doc-title { font-size: 18px; font-weight: 700; color: #d4920a; text-align: right; }
  .doc-ref { font-size: 12px; color: #666; text-align: right; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
  .info-item { padding: 12px 16px; background: #f8f8f8; border-radius: 6px; border-left: 3px solid #d4920a; }
  .info-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 4px; }
  .info-value { font-size: 14px; font-weight: 500; color: #222; }
  .total-box { margin: 24px 0; padding: 16px 20px; background: #1a1a2e; color: #fff; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 14px; font-weight: 600; letter-spacing: 1px; }
  .total-value { font-size: 22px; font-weight: 700; color: #d4920a; }
  .notes { margin: 20px 0; padding: 12px 16px; background: #fffbe6; border-radius: 6px; border-left: 3px solid #d4920a; }
  .notes-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 4px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
  .sig-box { text-align: center; width: 200px; }
  .sig-line { border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; color: #666; }
  .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  .meta { font-size: 11px; color: #666; margin-top: 8px; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${data.company.name}</div>
      <div class="company-sub">${data.company.address || ""}</div>
      <div class="company-sub">${data.company.phone ? "Tel: " + data.company.phone : ""}</div>
    </div>
    <div>
      <div class="doc-title">${data.title}</div>
      <div class="doc-ref">${data.reference}</div>
      <div class="doc-ref">${data.date}</div>
    </div>
  </div>

  <div class="info-grid">
    ${data.details
      .map(
        (d) => `
    <div class="info-item">
      <div class="info-label">${d.label}</div>
      <div class="info-value">${d.value}</div>
    </div>`,
      )
      .join("")}
  </div>

  ${
    data.totalLabel && data.totalValue
      ? `<div class="total-box">
    <span class="total-label">${data.totalLabel}</span>
    <span class="total-value">${data.totalValue}</span>
  </div>`
      : ""
  }

  ${
    data.notes
      ? `<div class="notes">
    <div class="notes-title">Notes</div>
    <div>${data.notes}</div>
  </div>`
      : ""
  }

  <div class="meta">Etabli par: ${data.createdBy}</div>

  <div class="signatures">
    <div class="sig-box"><div class="sig-line">Etabli par</div></div>
    <div class="sig-box"><div class="sig-line">Approuve par</div></div>
    <div class="sig-box"><div class="sig-line">Recu par</div></div>
  </div>

  <div class="footer">${data.company.name} - Document genere le ${data.date}</div>

  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 30px;font-size:14px;cursor:pointer;background:#d4920a;color:#000;border:none;border-radius:6px;font-weight:600;">Imprimer / Telecharger PDF</button>
  </div>
</body>
</html>`;
}

// ============================================
// Utility: open print window
// ============================================
export function openPrintWindow(html: string) {
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
