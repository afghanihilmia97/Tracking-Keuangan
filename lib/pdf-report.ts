import type { AppData } from "./finance-types";
import { formatMoney, type CurrencyCode } from "./preferences";

export async function exportFinancialPdf(data: AppData, currency:CurrencyCode="IDR") {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const income = data.transactions.filter(t => t.type === "income").reduce((s,t) => s+t.amount,0);
  const expense = data.transactions.filter(t => t.type === "expense").reduce((s,t) => s+t.amount,0);
  const generated = new Date().toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });

  doc.setFillColor(103, 88, 239);
  doc.rect(0, 0, 210, 42, "F");
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.text("FinanceTrack", 16, 18);
  doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.text("Laporan Keuangan Pribadi",16,26);
  doc.text(`Dibuat ${generated}`,16,33);

  doc.setTextColor(30,31,45); doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Ringkasan",16,55);
  const cards = [
    ["Pemasukan", formatMoney(income,currency)],
    ["Pengeluaran", formatMoney(expense,currency)],
    ["Saldo bersih", formatMoney(income-expense,currency)],
  ];
  cards.forEach(([label,value],i) => {
    const x=16+i*61; doc.setFillColor(246,246,251); doc.roundedRect(x,61,56,23,3,3,"F");
    doc.setTextColor(125,126,143); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text(label,x+5,69);
    doc.setTextColor(30,31,45); doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.text(value,x+5,77);
  });

  doc.setFontSize(12); doc.text("Daftar transaksi",16,96);
  autoTable(doc, {
    startY: 101,
    head: [["Tanggal","Transaksi","Kategori","Dompet","Jenis","Jumlah"]],
    body: [...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).map(t => [
      new Date(`${t.date}T00:00:00`).toLocaleDateString("id-ID"),
      t.title, t.category, data.wallets.find(w=>w.id===t.walletId)?.name || "-",
      t.type === "income" ? "Masuk" : "Keluar",
      formatMoney(t.amount,currency),
    ]),
    styles:{ font:"helvetica",fontSize:8,cellPadding:2.5,textColor:[45,46,60] },
    headStyles:{ fillColor:[103,88,239],textColor:255,fontStyle:"bold" },
    alternateRowStyles:{ fillColor:[248,248,252] },
    columnStyles:{5:{halign:"right"}},
    margin:{left:16,right:16,bottom:18},
    didDrawPage: () => {
      doc.setFontSize(8); doc.setTextColor(140,140,155);
      doc.text(`FinanceTrack - Halaman ${doc.getNumberOfPages()}`,16,289);
    },
  });
  doc.save(`laporan-financetrack-${new Date().toISOString().slice(0,10)}.pdf`);
}
