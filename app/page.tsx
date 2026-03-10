"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Printer,
  Trash2,
  Scale,
  Package,
  Search,
  FileText,
  Plus,
} from "lucide-react";

type RecordItem = {
  id: string;
  folio: string;
  buyer: string;
  supplier: string;
  boxes: number;
  grossWeight: number;
  boxTare: number;
  netWeight: number;
  createdAt: string;
};

const STORAGE_KEY = "tamarindo-pesadas-v1";

function formatNumber(value: string | number) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTicketHTML(record: RecordItem) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket de pesada</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          .ticket { max-width: 380px; margin: 0 auto; border: 1px dashed #333; padding: 20px; }
          h1 { font-size: 22px; margin: 0 0 12px; text-align: center; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; gap: 12px; }
          .muted { color: #555; }
          .total { margin-top: 16px; padding-top: 12px; border-top: 1px solid #ddd; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1>Ticket de pesada</h1>
          <div class="row"><span class="muted">Folio</span><span>${record.folio}</span></div>
          <div class="row"><span class="muted">Fecha</span><span>${formatDateTime(record.createdAt)}</span></div>
          <div class="row"><span class="muted">Comprador</span><span>${record.buyer}</span></div>
          <div class="row"><span class="muted">Proveedor</span><span>${record.supplier || "-"}</span></div>
          <div class="row"><span class="muted">Cajas</span><span>${record.boxes}</span></div>
          <div class="row"><span class="muted">Peso bruto</span><span>${formatNumber(record.grossWeight)} kg</span></div>
          <div class="row"><span class="muted">Tara cajas</span><span>${formatNumber(record.boxTare)} kg</span></div>
          <div class="row total"><span>Peso limpio</span><span>${formatNumber(record.netWeight)} kg</span></div>
          <div style="margin-top:16px" class="muted">Cada caja descuenta 1 kg.</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-700">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function Page() {
  const [buyer, setBuyer] = useState("Comprador Tamarindo");
  const [supplier, setSupplier] = useState("");
  const [boxes, setBoxes] = useState("1");
  const [grossWeight, setGrossWeight] = useState<string>("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [query, setQuery] = useState("");
  const [lastSavedFolio, setLastSavedFolio] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RecordItem[];
        if (Array.isArray(parsed)) setRecords(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const boxTare = useMemo(() => Number(boxes || 0) * 1, [boxes]);
    const incrementBoxes = () => {
      const current = Number(boxes || 0);
      setBoxes(String(Math.max(1, current + 1)));
    };

    const decrementBoxes = () => {
      const current = Number(boxes || 0);
      setBoxes(String(Math.max(1, current - 1)));
    };
  const netWeight = useMemo(() => {
    const gross = Number(grossWeight || 0);
    const net = gross - boxTare;
    return net >= 0 ? net : 0;
  }, [grossWeight, boxTare]);

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;

    return records.filter((r) =>
      [r.folio, r.buyer, r.supplier, String(r.boxes)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [records, query]);

  const totals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => {
        acc.gross += Number(r.grossWeight || 0);
        acc.net += Number(r.netWeight || 0);
        acc.boxes += Number(r.boxes || 0);
        return acc;
      },
      { gross: 0, net: 0, boxes: 0 }
    );
  }, [filteredRecords]);

  const printTicket = (record: RecordItem) => {
    const popup = window.open("", "_blank", "width=500,height=700");
    if (!popup) {
      alert("El navegador bloqueó la ventana emergente para imprimir.");
      return;
    }

    popup.document.open();
    popup.document.write(buildTicketHTML(record));
    popup.document.close();
  };

  const addRecord = (
  options?: { openPreview?: boolean; printAfterSave?: boolean }
) => {
  const gross = Number(grossWeight);
  const qtyBoxes = Number(boxes || 0);

  if (!buyer.trim()) {
    alert("Ingresa el nombre del comprador.");
    return;
  }

  if (!supplier.trim()) {
    alert("Ingresa el proveedor general.");
    return;
  }

  if (!qtyBoxes || qtyBoxes < 1) {
    alert("Las cajas deben ser al menos 1.");
    return;
  }

  if (!gross || gross <= 0) {
    alert("Ingresa un peso bruto válido.");
    return;
  }

  if (gross < qtyBoxes) {
    alert("El peso bruto no puede ser menor que la tara total de las cajas.");
    return;
  }

  const now = new Date();
  const folio = `TAM-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}-${now
    .getTime()
    .toString()
    .slice(-5)}`;

  const record: RecordItem = {
    id: crypto.randomUUID(),
    folio,
    buyer: buyer.trim(),
    supplier: supplier.trim(),
    boxes: qtyBoxes,
    grossWeight: gross,
    boxTare: qtyBoxes * 1,
    netWeight: gross - qtyBoxes,
    createdAt: now.toISOString(),
  };

  setRecords((prev) => [record, ...prev]);
  setLastSavedFolio(record.folio);
  setGrossWeight("");
  setBoxes("1");

  if (options?.openPreview) {
    setSelectedRecord(record);
  }

  if (options?.printAfterSave) {
    setTimeout(() => printTicket(record), 120);
  }
};

  const deleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedRecord?.id === id) setSelectedRecord(null);
  };

  const clearAllRecords = () => {
    const ok = window.confirm("¿Seguro que quieres borrar todas las pesadas registradas?");
    if (!ok) return;
    setRecords([]);
    setSelectedRecord(null);
    setLastSavedFolio("");
  };

  const exportCSV = () => {
    if (!records.length) {
      alert("No hay registros para exportar.");
      return;
    }

    const headers = [
      "folio",
      "fecha",
      "comprador",
      "proveedor",
      "cajas",
      "peso_bruto_kg",
      "tara_cajas_kg",
      "peso_limpio_kg",
    ];
    

    const rows = records.map((r) => [
      r.folio,
      formatDateTime(r.createdAt),
      r.buyer,
      r.supplier || "",
      r.boxes,
      formatNumber(r.grossWeight),
      formatNumber(r.boxTare),
      formatNumber(r.netWeight),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pesadas_tamarindo_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

    const printBatchReport = () => {
  if (!records.length) {
    alert("No hay pesadas registradas para generar el reporte.");
    return;
  }

  const totalGross = records.reduce((acc, r) => acc + Number(r.grossWeight || 0), 0);
  const totalNet = records.reduce((acc, r) => acc + Number(r.netWeight || 0), 0);
  const totalBoxes = records.reduce((acc, r) => acc + Number(r.boxes || 0), 0);

  const rowsHtml = records
    .map(
      (r, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${r.folio}</td>
          <td>${formatDateTime(r.createdAt)}</td>
          <td>${r.boxes}</td>
          <td>${formatNumber(r.grossWeight)} kg</td>
          <td>${formatNumber(r.boxTare)} kg</td>
          <td>${formatNumber(r.netWeight)} kg</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reporte de pesadas</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 24px;
          }
          .container {
            max-width: 1100px;
            margin: 0 auto;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 28px;
          }
          .sub {
            color: #555;
            margin-bottom: 20px;
          }
          .meta {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 20px;
          }
          .box {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 12px;
          }
          .label {
            color: #666;
            font-size: 12px;
            margin-bottom: 4px;
          }
          .value {
            font-size: 18px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            font-size: 14px;
          }
          th {
            background: #f3f4f6;
          }
          .totals {
            margin-top: 24px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .total-card {
            border: 1px solid #ddd;
            border-radius: 10px;
            padding: 14px;
            background: #fafafa;
          }
          .total-card .title {
            color: #666;
            font-size: 13px;
            margin-bottom: 6px;
          }
          .total-card .number {
            font-size: 26px;
            font-weight: bold;
          }
          .footer {
            margin-top: 28px;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
            }
            .container {
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reporte de pesadas de tamarindo</h1>
          <div class="sub">Resumen del lote capturado</div>

          <div class="meta">
            <div class="box">
              <div class="label">Comprador</div>
              <div class="value">${buyer || "-"}</div>
            </div>
            <div class="box">
              <div class="label">Proveedor</div>
              <div class="value">${records[0]?.supplier || supplier || "-"}</div>
            </div>
            <div class="box">
              <div class="label">Fecha del reporte</div>
              <div class="value">${new Date().toLocaleString("es-MX")}</div>
            </div>
            <div class="box">
              <div class="label">Número de pesadas</div>
              <div class="value">${records.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Cajas</th>
                <th>Peso bruto</th>
                <th>Tara</th>
                <th>Peso limpio</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-card">
              <div class="title">Total de cajas</div>
              <div class="number">${totalBoxes}</div>
            </div>
            <div class="total-card">
              <div class="title">Total bruto</div>
              <div class="number">${formatNumber(totalGross)} kg</div>
            </div>
            <div class="total-card">
              <div class="title">Total limpio</div>
              <div class="number">${formatNumber(totalNet)} kg</div>
            </div>
          </div>

          <div class="footer">
            Este reporte incluye todas las pesadas registradas en el lote actual.
          </div>
        </div>

        <script>
          window.onload = () => window.print();
        </script>
      </body>
    </html>
  `;

  const popup = window.open("", "_blank", "width=1200,height=900");
  if (!popup) {
    alert("El navegador bloqueó la ventana emergente para generar el reporte.");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Control de pesadas de tamarindo
          </h1>
          <p className="mt-1 text-slate-600">
            Registra varias pesadas y obtén el acumulado total del día.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Peso bruto total"
            value={`${formatNumber(totals.gross)} kg`}
            subtitle="Suma total registrada"
            icon={<Scale className="h-5 w-5" />}
          />
          <StatCard
            title="Peso limpio total"
            value={`${formatNumber(totals.net)} kg`}
            subtitle="Descontando 1 kg por caja"
            icon={<Package className="h-5 w-5" />}
          />
          <StatCard
            title="Cajas registradas"
            value={`${totals.boxes}`}
            subtitle="Total acumulado de cajas"
            icon={<Plus className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-900">Nueva pesada</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Comprador
                </label>
                <input
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  placeholder="Nombre del comprador"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Proveedor general
                </label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Ej. Don José"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Este proveedor se conservará para todas las pesadas hasta que lo cambies.
                </p>
              </div>
      
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Número de cajas
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-11 w-11 shrink-0 rounded-xl border border-slate-300 bg-white p-0 text-lg font-semibold text-slate-800 hover:bg-slate-50"
                onClick={decrementBoxes}
              >
                -
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={boxes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const clean = e.target.value.replace(/\D/g, "");
                  setBoxes(clean);
                }}
                placeholder="1"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
              />

              <button
                type="button"
                className="h-11 w-11 shrink-0 rounded-xl border border-slate-300 bg-white p-0 text-lg font-semibold text-slate-800 hover:bg-slate-50"
                onClick={incrementBoxes}
              >
                +
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Puedes escribir la cantidad o usar + y -.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Peso bruto (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={grossWeight}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setGrossWeight(e.target.value)
              }
              placeholder="Ej. 38.50"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
            />
          </div>
        </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Peso bruto (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="Ej. 38.50"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">Cálculo automático</div>

                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-700">Tara por cajas</span>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
                    {formatNumber(boxTare)} kg
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-700">Peso bruto</span>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700">
                    {formatNumber(grossWeight)} kg
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                  <span>Peso limpio</span>
                  <span>{formatNumber(netWeight)} kg</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => addRecord()}
                    className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
                  >
                    Guardar y seguir capturando
                  </button>

                  <button
                    onClick={() => addRecord({ printAfterSave: true })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" />
                    Guardar e imprimir
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => addRecord({ openPreview: true })}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-200 px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-300"
                  >
                    <FileText className="h-4 w-4" />
                    Guardar y ver detalle
                  </button>

                  <button
                    onClick={exportCSV}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </button>
                </div>
              </div>

              {lastSavedFolio && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Última pesada guardada:{" "}
                  <span className="font-semibold">{lastSavedFolio}</span>
                </div>
              )}

              <p className="text-xs leading-5 text-slate-500">
                El proveedor permanece fijo hasta que lo cambies. El sistema acumula automáticamente el total del día.
              </p>
              </section>
            </div>
          

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Historial de pesadas</h2>

              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por folio o proveedor"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
                />
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="text-sm text-slate-500">Total bruto</div>
                <div className="text-2xl font-bold text-slate-900">{formatNumber(totals.gross)} kg</div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="text-sm text-slate-500">Total limpio</div>
                <div className="text-2xl font-bold text-slate-900">{formatNumber(totals.net)} kg</div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="text-sm text-slate-500">Total cajas</div>
                <div className="text-2xl font-bold text-slate-900">{totals.boxes}</div>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={exportCSV}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 hover:bg-slate-50"
              >
                Exportar CSV del día
              </button>
              <button
                onClick={clearAllRecords}
                className="rounded-2xl border border-red-300 bg-white px-4 py-3 font-medium text-red-600 hover:bg-red-50"
              >
                Limpiar registros
              </button>
            </div>
              <button
                onClick={printBatchReport}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 hover:bg-slate-50"
                >
                  Generar PDF del lote
              </button>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Folio</th>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold">Cajas</th>
                    <th className="px-4 py-3 text-left font-semibold">Bruto</th>
                    <th className="px-4 py-3 text-left font-semibold">Limpio</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="border-t border-slate-200 bg-white">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{record.folio}</div>
                          <div className="text-xs text-slate-500">
                            {record.supplier || "Sin proveedor"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDateTime(record.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{record.boxes}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatNumber(record.grossWeight)} kg
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatNumber(record.netWeight)} kg
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="rounded-xl border border-slate-300 p-2 hover:bg-slate-50"
                              title="Ver detalle"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => printTicket(record)}
                              className="rounded-xl border border-slate-300 p-2 hover:bg-slate-50"
                              title="Imprimir"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="rounded-xl border border-slate-300 p-2 hover:bg-slate-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No hay registros todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Detalle de la pesada</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Folio</div>
                <div className="font-medium text-slate-900">{selectedRecord.folio}</div>
              </div>
              <div>
                <div className="text-slate-500">Fecha</div>
                <div className="font-medium text-slate-900">
                  {formatDateTime(selectedRecord.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Comprador</div>
                <div className="font-medium text-slate-900">{selectedRecord.buyer}</div>
              </div>
              <div>
                <div className="text-slate-500">Proveedor</div>
                <div className="font-medium text-slate-900">
                  {selectedRecord.supplier || "-"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Cajas</div>
                <div className="font-medium text-slate-900">{selectedRecord.boxes}</div>
              </div>
              <div>
                <div className="text-slate-500">Tara</div>
                <div className="font-medium text-slate-900">
                  {formatNumber(selectedRecord.boxTare)} kg
                </div>
              </div>
              <div>
                <div className="text-slate-500">Peso bruto</div>
                <div className="font-medium text-slate-900">
                  {formatNumber(selectedRecord.grossWeight)} kg
                </div>
              </div>
              <div>
                <div className="text-slate-500">Peso limpio</div>
                <div className="font-medium text-slate-900">
                  {formatNumber(selectedRecord.netWeight)} kg
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => printTicket(selectedRecord)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Imprimir ticket
              </button>
              <button
                onClick={() => printTicket(selectedRecord)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" />
                Guardar como PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}