const W  = 80;  // ancho del recibo (mm)
const M  = 5;   // margen horizontal
const CW = W - 2 * M;  // ancho del contenido = 70mm

const C = {
  bg:     [15,  17,  23]  as [number, number, number],
  card:   [26,  29,  39]  as [number, number, number],
  indigo: [99,  102, 241] as [number, number, number],
  white:  [240, 240, 240] as [number, number, number],
  gray:   [107, 114, 128] as [number, number, number],
  green:  [74,  222, 128] as [number, number, number],
  line:   [42,  45,  58]  as [number, number, number],
};

function fmt(n: number): string {
  return 'Q ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('es-GT');
}

/* ── Header ────────────────────────────────── */
function drawHeader(doc: any, tipo: string, authNum?: string): number {
  const H = authNum ? 36 : 30;
  let y = M;

  doc.setFillColor(...C.card);
  doc.roundedRect(M, y, CW, H, 3, 3, 'F');

  // Logo
  y += 8;
  doc.setTextColor(...C.indigo);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FINTECH ATM', W / 2, y, { align: 'center' });

  // Subtítulo
  y += 6;
  doc.setTextColor(...C.gray);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(tipo, W / 2, y, { align: 'center' });

  // Línea separadora
  y += 5;
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.line(M + 4, y, M + CW - 4, y);

  // Número de autorización (si hay)
  if (authNum) {
    y += 5;
    doc.setTextColor(...C.white);
    doc.setFontSize(7);
    doc.setFont('courier', 'bold');
    doc.text(`No. Auth: ${authNum}`, W / 2, y, { align: 'center' });
  }

  return M + H + 5; // margen inferior del header
}

/* ── Fila de dato: etiqueta encima, valor abajo ─ */
function drawField(doc: any, label: string, value: string, y: number): number {
  const H = 13;

  doc.setFillColor(...C.card);
  doc.roundedRect(M, y, CW, H, 2, 2, 'F');

  // Etiqueta (pequeña, gris, mayúscula)
  doc.setTextColor(...C.gray);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(label.toUpperCase(), M + 4, y + 4.5);

  // Valor (más grande, blanco, negrita)
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  // Truncar si excede el ancho disponible
  let v = value || '-';
  const maxW = CW - 8;
  while (v.length > 1 && (doc as any).getTextWidth(v) > maxW) {
    v = v.slice(0, -1);
  }
  if (v !== (value || '-')) v += '…';
  doc.text(v, M + 4, y + 10);

  return y + H + 2; // 2mm entre filas
}

/* ── Bloque de monto principal ──────────────── */
function drawAmount(doc: any, label: string, amount: number, y: number): number {
  const H = 24;
  doc.setFillColor(...C.indigo);
  doc.roundedRect(M, y, CW, H, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(label, W / 2, y + 8, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(amount), W / 2, y + 18, { align: 'center' });

  return y + H + 2;
}

/* ── Fila de saldo nuevo ────────────────────── */
function drawSaldo(doc: any, saldo: number, y: number): number {
  const H = 11;
  doc.setFillColor(...C.card);
  doc.roundedRect(M, y, CW, H, 2, 2, 'F');

  doc.setTextColor(...C.gray);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('SALDO NUEVO', M + 4, y + 4.5);

  doc.setTextColor(...C.green);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(saldo), M + CW - 4, y + 8.5, { align: 'right' });

  return y + H + 3;
}

/* ── Pie de página ──────────────────────────── */
function drawFooter(doc: any, y: number) {
  doc.setTextColor(...C.gray);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('CONSERVE ESTE COMPROBANTE', W / 2, y, { align: 'center' });
  doc.setFontSize(5);
  doc.setTextColor(...C.line);
  doc.text('Generado por FINTECH ATM', W / 2, y + 5, { align: 'center' });
}

/* ── Exports ─────────────────────────────────── */

export async function descargarPdfRetiro(comprobante: any) {
  const authStr = comprobante.auth_num
    ? `#${String(comprobante.auth_num).padStart(6, '0')}`
    : undefined;

  // Calcular altura dinámica
  const numFields = 5 + (comprobante.auth_num ? 0 : 0); // siempre 5 (auth va en header)
  const height = M + (authStr ? 36 : 30) + 5   // header
    + numFields * 15                             // filas
    + 2 + 24 + 2 + 11 + 3 + 14 + M;            // amount + saldo + footer

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, height] });

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, height, 'F');

  let y = drawHeader(doc, 'COMPROBANTE DE RETIRO', authStr);
  y = drawField(doc, 'Titular', comprobante.titular, y);
  y = drawField(doc, 'No. de cuenta', comprobante.cuenta?.numero_cuenta || comprobante.cuenta?.tipo_cuenta || 'Cuenta', y);
  y = drawField(doc, 'Tipo de cuenta', comprobante.cuenta?.tipo_cuenta || '-', y);
  y = drawField(doc, 'Fecha', fmtDate(comprobante.fecha), y);
  y = drawField(doc, 'Hora', fmtTime(comprobante.fecha), y);
  y += 2;
  y = drawAmount(doc, 'MONTO RETIRADO', comprobante.monto, y);
  y = drawSaldo(doc, comprobante.saldo_nuevo, y);
  drawFooter(doc, y);

  doc.save(`comprobante_retiro_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function descargarPdfTransferencia(comprobante: any) {
  const authStr = comprobante.auth_num
    ? `#${String(comprobante.auth_num).padStart(6, '0')}`
    : undefined;

  const numFields = 6; // titular, cuenta origen, tipo, destinatario, cuenta destino, fecha+hora
  const height = M + (authStr ? 36 : 30) + 5
    + numFields * 15
    + 2 + 24 + 14 + M;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, height] });

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, height, 'F');

  let y = drawHeader(doc, 'COMPROBANTE DE TRANSFERENCIA', authStr);
  y = drawField(doc, 'Titular', comprobante.titular_origen, y);
  y = drawField(doc, 'Cuenta origen', comprobante.desde?.numero_cuenta || comprobante.desde?.tipo_cuenta || 'Cuenta', y);
  y = drawField(doc, 'Tipo de cuenta', comprobante.desde?.tipo_cuenta || '-', y);
  y = drawField(doc, 'Destinatario', comprobante.para || '-', y);
  y = drawField(doc, 'Cuenta destino', comprobante.cuentaDestino?.numero_cuenta || comprobante.cuentaDestino?.tipo_cuenta || '-', y);
  y = drawField(doc, 'Fecha', fmtDate(comprobante.fecha), y);
  y = drawField(doc, 'Hora', fmtTime(comprobante.fecha), y);
  y += 2;
  y = drawAmount(doc, 'MONTO TRANSFERIDO', comprobante.monto, y);
  drawFooter(doc, y);

  doc.save(`comprobante_transferencia_${new Date().toISOString().slice(0, 10)}.pdf`);
}
