// Formateadores y utilidades de presentación (es-PE)

export const soles = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "2026-09-12" o "2026-09-12 10:30:00" → "12/09/2026" */
export function fecha(valor) {
  if (!valor) return '';
  const [d] = String(valor).split(/[ T]/);
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}`;
}

/** "2026-09-12 10:30:00" → "12/09/2026 10:30" */
export function fechaHora(valor) {
  if (!valor) return '';
  const [d, h = ''] = String(valor).split(/[ T]/);
  return `${fecha(d)} ${h.slice(0, 5)}`.trim();
}

export function hora(valor) {
  if (!valor) return '';
  const partes = String(valor).split(/[ T]/);
  return (partes[1] || '').slice(0, 5);
}

export const esStockBajo = (p) => Number(p.stock) <= Number(p.stock_minimo ?? 20);

/** Descarga un texto como archivo (CSV con BOM para que Excel lea las tildes). */
export function descargarArchivo(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿', contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function aCSV(filas) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return filas.map((f) => f.map(esc).join(',')).join('\r\n');
}
