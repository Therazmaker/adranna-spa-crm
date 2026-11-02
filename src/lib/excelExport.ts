import { Appointment, Expense, PaymentMethod } from '@/types/database';

export interface CashReconciliationReportInput {
  periodLabel: string;
  dateRangeLabel: string;
  openingCash: number;
  countedPhysicalCash: number | null;
  cashierName: string;
  closingNotes: string;
  appointments: Appointment[];
  expenses: Expense[];
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  yape_plin: 'Yape / Plin',
  tarjeta: 'Tarjeta / POS',
  transferencia: 'Transferencia Bancaria',
};

const EXPENSE_CATEGORY_LABELS: Record<Expense['category'], string> = {
  insumos: 'Insumos Clínicos & Descartables',
  alquiler: 'Alquiler & Local',
  servicios: 'Servicios (Luz, Agua, Internet)',
  personal: 'Honorarios / Personal',
  otros: 'Otros Gastos',
};

function escapeXml(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cellString(text: unknown, styleId = 'sCell', mergeAcross = 0): string {
  const mergeAttr = mergeAcross > 0 ? ` ss:MergeAcross="${mergeAcross}"` : '';
  return `<Cell ss:StyleID="${styleId}"${mergeAttr}><Data ss:Type="String">${escapeXml(text)}</Data></Cell>`;
}

function cellNumber(num: number, styleId = 'sCurrency', mergeAcross = 0): string {
  const safeNum = Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
  const mergeAttr = mergeAcross > 0 ? ` ss:MergeAcross="${mergeAcross}"` : '';
  return `<Cell ss:StyleID="${styleId}"${mergeAttr}><Data ss:Type="Number">${safeNum}</Data></Cell>`;
}

/**
 * Genera y descarga un libro de Excel (.xls SpreadsheetML multi-hoja con formato contable)
 * listo para abrir en Microsoft Excel, LibreOffice o Google Sheets.
 */
export function exportCashReconciliationExcel(input: CashReconciliationReportInput): void {
  const {
    periodLabel,
    dateRangeLabel,
    openingCash,
    countedPhysicalCash,
    cashierName,
    closingNotes,
    appointments,
    expenses,
  } = input;

  // Ordenar citas y gastos cronológicamente
  const sortedApts = [...appointments].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  const sortedExps = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  // Cálculos por método de pago
  const methods: PaymentMethod[] = ['efectivo', 'yape_plin', 'tarjeta', 'transferencia'];
  const byMethod = methods.map((m) => {
    const aptsForM = sortedApts.filter((a) => (a.paymentMethod || 'efectivo') === m);
    const expsForM = sortedExps.filter((e) => (e.paymentMethod || 'efectivo') === m);
    const income = aptsForM.reduce((s, a) => s + (Number(a.price) || 0), 0);
    const expense = expsForM.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return {
      method: m,
      label: PAYMENT_METHOD_LABELS[m],
      incomeCount: aptsForM.length,
      income,
      expenseCount: expsForM.length,
      expense,
      net: income - expense,
    };
  });

  const cashRow = byMethod.find((b) => b.method === 'efectivo')!;
  const expectedPhysicalCash = openingCash + cashRow.income - cashRow.expense;
  const hasCounted = countedPhysicalCash !== null && !Number.isNaN(countedPhysicalCash);
  const cashDifference = hasCounted ? countedPhysicalCash - expectedPhysicalCash : 0;

  let diffStatus = 'Pendiente de conteo físico';
  if (hasCounted) {
    if (Math.abs(cashDifference) < 0.01) diffStatus = 'CAJA CUADRADA EXACTA';
    else if (cashDifference > 0) diffStatus = `SOBRANTE EN CAJA (+S/ ${cashDifference.toFixed(2)})`;
    else diffStatus = `FALTANTE EN CAJA (-S/ ${Math.abs(cashDifference).toFixed(2)})`;
  }

  // Totales generales y desglose por servicio / productos
  const totalIncome = sortedApts.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const totalExpenses = sortedExps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const totalProductsSold = sortedApts.reduce(
    (s, a) => s + (Number(a.productsTotal) || 0),
    0
  );
  const podoServiceIncome = sortedApts
    .filter((a) => a.discipline === 'podologia')
    .reduce(
      (s, a) =>
        s +
        (a.servicePrice !== undefined
          ? Number(a.servicePrice)
          : (Number(a.price) || 0) - (Number(a.productsTotal) || 0)),
      0
    );
  const spaServiceIncome = sortedApts
    .filter((a) => a.discipline === 'masaje')
    .reduce(
      (s, a) =>
        s +
        (a.servicePrice !== undefined
          ? Number(a.servicePrice)
          : (Number(a.price) || 0) - (Number(a.productsTotal) || 0)),
      0
    );

  // Producción por especialista
  const profMap = new Map<
    string,
    {
      name: string;
      role: string;
      sessions: number;
      serviceIncome: number;
      productsIncome: number;
      total: number;
    }
  >();

  for (const a of sortedApts) {
    const key = a.professionalName || 'Sin asignar';
    const curr = profMap.get(key) || {
      name: key,
      role: a.professionalRole || (a.discipline === 'podologia' ? 'Podología' : 'Masoterapia'),
      sessions: 0,
      serviceIncome: 0,
      productsIncome: 0,
      total: 0,
    };
    const prodAmt = Number(a.productsTotal) || 0;
    const totalAmt = Number(a.price) || 0;
    const srvAmt = a.servicePrice !== undefined ? Number(a.servicePrice) : totalAmt - prodAmt;

    curr.sessions += 1;
    curr.serviceIncome += srvAmt;
    curr.productsIncome += prodAmt;
    curr.total += totalAmt;
    profMap.set(key, curr);
  }

  const profRows = Array.from(profMap.values()).sort((a, b) => b.total - a.total);
  const emittedAt = new Date().toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ─── Construir XML SpreadsheetML con 4 pestañas ────────────────────────────
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Cuadre de Caja - Adranna Podología &amp; Spa</Title>
  <Author>${escapeXml(cashierName || 'Administración Adranna')}</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="sTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B4332" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sSubtitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#D8F3DC"/>
   <Interior ss:Color="#2D6A4F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sSectionHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1B4332"/>
   <Interior ss:Color="#D8F3DC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#2D6A4F"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#2D6A4F"/>
   </Borders>
  </Style>
  <Style ss:ID="sTableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2D6A4F" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
   </Borders>
  </Style>
  <Style ss:ID="sMetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#374151"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
  <Style ss:ID="sCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="sCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="sCellBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#111827"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
  <Style ss:ID="sInt">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="sCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;S/&quot;\ #,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="sCurrencyExpense">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#B91C1C"/>
   <NumberFormat ss:Format="&quot;-S/&quot;\ #,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="sTotalLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1B4332"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1B4332"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
  <Style ss:ID="sTotalCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1B4332"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;S/&quot;\ #,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1B4332"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
  <Style ss:ID="sTotalInt">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1B4332"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#1B4332"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B4332"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
 </Styles>

 <!-- =================================================================== -->
 <!-- HOJA 1: CUADRE DE CAJA (RESUMEN Y ARQUEO)                           -->
 <!-- =================================================================== -->
 <Worksheet ss:Name="Cuadre de Caja">
  <Table>
   <Column ss:Width="230"/>
   <Column ss:Width="95"/>
   <Column ss:Width="125"/>
   <Column ss:Width="95"/>
   <Column ss:Width="125"/>
   <Column ss:Width="135"/>

   <Row ss:Height="28">
    ${cellString('ADRANNA PODOLOGÍA & SPA — REPORTE DE CUADRE Y ARQUEO DE CAJA', 'sTitle', 5)}
   </Row>
   <Row ss:Height="20">
    ${cellString(`Período: ${periodLabel} (${dateRangeLabel})   |   Emitido: ${emittedAt}`, 'sSubtitle', 5)}
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="20">
    ${cellString('Responsable de Caja / Turno:', 'sMetaLabel')}
    ${cellString(cashierName || 'Administración', 'sCellBold', 2)}
    ${cellString('Estado del Arqueo:', 'sMetaLabel')}
    ${cellString(diffStatus, 'sCellBold')}
   </Row>
   <Row ss:Height="20">
    ${cellString('Observaciones del Cierre:', 'sMetaLabel')}
    ${cellString(closingNotes || 'Sin observaciones adicionales', 'sCell', 4)}
   </Row>
   <Row ss:Height="12"/>

   <!-- SECCIÓN 1: ARQUEO DE EFECTIVO EN CAJÓN -->
   <Row ss:Height="24">
    ${cellString('1. ARQUEO DE EFECTIVO FÍSICO EN CAJA (SOLES PEN)', 'sSectionHeader', 5)}
   </Row>
   <Row ss:Height="22">
    ${cellString('Concepto de Caja Efectivo', 'sTableHeader', 3)}
    ${cellString('Monto (S/)', 'sTableHeader', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString('(+) Fondo Inicial de Caja (Apertura / Sencillo)', 'sCell', 3)}
    ${cellNumber(openingCash, 'sCurrency', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString(`(+) Ingresos Cobrados en Efectivo (${cashRow.incomeCount} sesiones/ventas)`, 'sCell', 3)}
    ${cellNumber(cashRow.income, 'sCurrency', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString(`(-) Egresos / Gastos Pagados en Efectivo (${cashRow.expenseCount} registros)`, 'sCell', 3)}
    ${cellNumber(cashRow.expense, 'sCurrencyExpense', 1)}
   </Row>
   <Row ss:Height="22">
    ${cellString('(=) EFECTIVO ESPERADO EN CAJÓN (Según Sistema)', 'sTotalLabel', 3)}
    ${cellNumber(expectedPhysicalCash, 'sTotalCurrency', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString('Efectivo Físico Contado en Cajón (Arqueo Real)', 'sCellBold', 3)}
    ${hasCounted ? cellNumber(countedPhysicalCash!, 'sCurrency', 1) : cellString('No ingresado', 'sCellCenter', 1)}
   </Row>
   <Row ss:Height="22">
    ${cellString('DIFERENCIA DE CAJA (Contado Físico - Esperado Sistema)', 'sTotalLabel', 3)}
    ${hasCounted ? cellNumber(cashDifference, 'sTotalCurrency', 1) : cellString(diffStatus, 'sCellCenter', 1)}
   </Row>
   <Row ss:Height="14"/>

   <!-- SECCIÓN 2: DESGLOSE POR MÉTODO DE PAGO -->
   <Row ss:Height="24">
    ${cellString('2. CUADRE POR MÉTODO DE PAGO (CAJA FÍSICA Y CUENTAS BANCARIAS / DIGITALES)', 'sSectionHeader', 5)}
   </Row>
   <Row ss:Height="22">
    ${cellString('Método / Canal de Pago', 'sTableHeader')}
    ${cellString('N° Cobros', 'sTableHeader')}
    ${cellString('Ingresos (S/)', 'sTableHeader')}
    ${cellString('N° Gastos', 'sTableHeader')}
    ${cellString('Egresos (S/)', 'sTableHeader')}
    ${cellString('Saldo Neto Canal (S/)', 'sTableHeader')}
   </Row>
   ${byMethod
     .map(
       (row) => `<Row ss:Height="20">
    ${cellString(row.label, 'sCellBold')}
    ${cellNumber(row.incomeCount, 'sInt')}
    ${cellNumber(row.income, 'sCurrency')}
    ${cellNumber(row.expenseCount, 'sInt')}
    ${cellNumber(row.expense, 'sCurrencyExpense')}
    ${cellNumber(row.net, 'sCurrency')}
   </Row>`
     )
     .join('\n   ')}
   <Row ss:Height="22">
    ${cellString('TOTAL TODOS LOS MEDIOS DE PAGO', 'sTotalLabel')}
    ${cellNumber(sortedApts.length, 'sTotalInt')}
    ${cellNumber(totalIncome, 'sTotalCurrency')}
    ${cellNumber(sortedExps.length, 'sTotalInt')}
    ${cellNumber(totalExpenses, 'sTotalCurrency')}
    ${cellNumber(netProfit, 'sTotalCurrency')}
   </Row>
   <Row ss:Height="14"/>

   <!-- SECCIÓN 3: RESUMEN POR ESPECIALIDAD Y PRODUCTOS -->
   <Row ss:Height="24">
    ${cellString('3. RESUMEN DE INGRESOS POR ESPECIALIDAD, PRODUCTOS Y UTILIDAD NETA', 'sSectionHeader', 5)}
   </Row>
   <Row ss:Height="22">
    ${cellString('Rubro / Línea de Ingreso', 'sTableHeader', 3)}
    ${cellString('Importe (S/)', 'sTableHeader', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString('Servicios de Podología Clínica', 'sCell', 3)}
    ${cellNumber(podoServiceIncome, 'sCurrency', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString('Servicios de Masajes & Bienestar (Spa)', 'sCell', 3)}
    ${cellNumber(spaServiceIncome, 'sCurrency', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString('Venta de Productos de Inventario en Sesión', 'sCell', 3)}
    ${cellNumber(totalProductsSold, 'sCurrency', 1)}
   </Row>
   <Row ss:Height="21">
    ${cellString('TOTAL INGRESOS BRUTOS DEL PERÍODO', 'sCellBold', 3)}
    ${cellNumber(totalIncome, 'sCurrency', 1)}
   </Row>
   <Row ss:Height="20">
    ${cellString('(-) Total Gastos Operativos e Insumos', 'sCell', 3)}
    ${cellNumber(totalExpenses, 'sCurrencyExpense', 1)}
   </Row>
   <Row ss:Height="23">
    ${cellString(
      `(=) UTILIDAD NETA DEL SPA (${totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0}% margen)`,
      'sTotalLabel',
      3
    )}
    ${cellNumber(netProfit, 'sTotalCurrency', 1)}
   </Row>
  </Table>
 </Worksheet>

 <!-- =================================================================== -->
 <!-- HOJA 2: DETALLE DE INGRESOS (CITAS Y PRODUCTOS VENDIDOS)            -->
 <!-- =================================================================== -->
 <Worksheet ss:Name="Detalle Ingresos">
  <Table>
   <Column ss:Width="80"/>
   <Column ss:Width="55"/>
   <Column ss:Width="155"/>
   <Column ss:Width="90"/>
   <Column ss:Width="85"/>
   <Column ss:Width="175"/>
   <Column ss:Width="130"/>
   <Column ss:Width="85"/>
   <Column ss:Width="85"/>
   <Column ss:Width="115"/>
   <Column ss:Width="95"/>
   <Column ss:Width="180"/>
   <Column ss:Width="95"/>
   <Column ss:Width="105"/>
   <Column ss:Width="180"/>
   <Column ss:Width="180"/>

   <Row ss:Height="26">
    ${cellString('DETALLE DE INGRESOS POR CITAS Y VENTA DE PRODUCTOS', 'sTitle', 15)}
   </Row>
   <Row ss:Height="22">
    ${cellString('Fecha', 'sTableHeader')}
    ${cellString('Hora', 'sTableHeader')}
    ${cellString('Paciente / Cliente', 'sTableHeader')}
    ${cellString('Teléfono', 'sTableHeader')}
    ${cellString('Disciplina', 'sTableHeader')}
    ${cellString('Servicio / Tratamiento', 'sTableHeader')}
    ${cellString('Especialista', 'sTableHeader')}
    ${cellString('Cabina', 'sTableHeader')}
    ${cellString('Estado', 'sTableHeader')}
    ${cellString('Método de Pago', 'sTableHeader')}
    ${cellString('Servicio (S/)', 'sTableHeader')}
    ${cellString('Productos Vendidos', 'sTableHeader')}
    ${cellString('Productos (S/)', 'sTableHeader')}
    ${cellString('Total Cobrado (S/)', 'sTableHeader')}
    ${cellString('Observaciones (Hallazgos)', 'sTableHeader')}
    ${cellString('Procedimiento Realizado', 'sTableHeader')}
   </Row>
   ${
     sortedApts.length === 0
       ? `<Row ss:Height="20">${cellString('No hay ingresos registrados en este período.', 'sCell', 15)}</Row>`
       : sortedApts
           .map((a) => {
             const prodAmt = Number(a.productsTotal) || 0;
             const totalAmt = Number(a.price) || 0;
             const srvAmt =
               a.servicePrice !== undefined ? Number(a.servicePrice) : totalAmt - prodAmt;
             const prodSummary =
               a.soldProducts && a.soldProducts.length > 0
                 ? a.soldProducts
                     .map((p) => `${p.quantity}x ${p.name} (${p.presentation})`)
                     .join(', ')
                 : '—';
             const payLabel = PAYMENT_METHOD_LABELS[a.paymentMethod || 'efectivo'] || 'Efectivo';
             return `<Row ss:Height="20">
    ${cellString(a.date, 'sCellCenter')}
    ${cellString(a.time, 'sCellCenter')}
    ${cellString(a.clientName, 'sCellBold')}
    ${cellString(a.clientPhone || '—', 'sCellCenter')}
    ${cellString(a.discipline === 'podologia' ? 'Podología' : 'Masaje / Spa', 'sCellCenter')}
    ${cellString(a.serviceName, 'sCell')}
    ${cellString(a.professionalName, 'sCell')}
    ${cellString(a.cabinName, 'sCellCenter')}
    ${cellString(a.status.toUpperCase(), 'sCellCenter')}
    ${cellString(payLabel, 'sCellCenter')}
    ${cellNumber(srvAmt, 'sCurrency')}
    ${cellString(prodSummary, 'sCell')}
    ${cellNumber(prodAmt, 'sCurrency')}
    ${cellNumber(totalAmt, 'sCurrency')}
    ${cellString((a.notes || '').replace(/\n+/g, ' | '), 'sCell')}
    ${cellString((a.procedure || a.serviceName || '').replace(/\n+/g, ' | '), 'sCell')}
   </Row>`;
           })
           .join('\n   ')
   }
   <Row ss:Height="23">
    ${cellString(`TOTAL INGRESOS (${sortedApts.length} registros)`, 'sTotalLabel', 9)}
    ${cellNumber(podoServiceIncome + spaServiceIncome, 'sTotalCurrency')}
    ${cellString('', 'sTotalLabel')}
    ${cellNumber(totalProductsSold, 'sTotalCurrency')}
    ${cellNumber(totalIncome, 'sTotalCurrency')}
    ${cellString('', 'sTotalLabel', 1)}
   </Row>
  </Table>
 </Worksheet>

 <!-- =================================================================== -->
 <!-- HOJA 3: DETALLE DE EGRESOS Y COMPRAS OPERATIVAS                     -->
 <!-- =================================================================== -->
 <Worksheet ss:Name="Detalle Egresos">
  <Table>
   <Column ss:Width="85"/>
   <Column ss:Width="240"/>
   <Column ss:Width="170"/>
   <Column ss:Width="130"/>
   <Column ss:Width="220"/>
   <Column ss:Width="120"/>

   <Row ss:Height="26">
    ${cellString('REGISTRO DETALLADO DE GASTOS Y EGRESOS DE CAJA', 'sTitle', 5)}
   </Row>
   <Row ss:Height="22">
    ${cellString('Fecha', 'sTableHeader')}
    ${cellString('Concepto / Descripción del Gasto', 'sTableHeader')}
    ${cellString('Categoría Contable', 'sTableHeader')}
    ${cellString('Método de Pago', 'sTableHeader')}
    ${cellString('Notas / Proveedor / Comprobante', 'sTableHeader')}
    ${cellString('Monto Egreso (S/)', 'sTableHeader')}
   </Row>
   ${
     sortedExps.length === 0
       ? `<Row ss:Height="20">${cellString('No hay gastos ni egresos registrados en este período.', 'sCell', 5)}</Row>`
       : sortedExps
           .map((e) => {
             const catLabel = EXPENSE_CATEGORY_LABELS[e.category] || e.category;
             const payLabel = PAYMENT_METHOD_LABELS[e.paymentMethod || 'efectivo'] || e.paymentMethod;
             return `<Row ss:Height="20">
    ${cellString(e.date, 'sCellCenter')}
    ${cellString(e.description, 'sCellBold')}
    ${cellString(catLabel, 'sCell')}
    ${cellString(payLabel, 'sCellCenter')}
    ${cellString(e.notes || '—', 'sCell')}
    ${cellNumber(Number(e.amount) || 0, 'sCurrencyExpense')}
   </Row>`;
           })
           .join('\n   ')
   }
   <Row ss:Height="23">
    ${cellString(`TOTAL EGRESOS (${sortedExps.length} registros)`, 'sTotalLabel', 4)}
    ${cellNumber(totalExpenses, 'sTotalCurrency')}
   </Row>
  </Table>
 </Worksheet>

 <!-- =================================================================== -->
 <!-- HOJA 4: PRODUCCIÓN POR ESPECIALISTA / PROFESIONAL                   -->
 <!-- =================================================================== -->
 <Worksheet ss:Name="Produccion Especialistas">
  <Table>
   <Column ss:Width="180"/>
   <Column ss:Width="140"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="135"/>

   <Row ss:Height="26">
    ${cellString('PRODUCCIÓN Y RECAUDACIÓN POR ESPECIALISTA', 'sTitle', 5)}
   </Row>
   <Row ss:Height="22">
    ${cellString('Especialista / Profesional', 'sTableHeader')}
    ${cellString('Rol / Especialidad', 'sTableHeader')}
    ${cellString('Sesiones Atendidas', 'sTableHeader')}
    ${cellString('Servicios (S/)', 'sTableHeader')}
    ${cellString('Productos (S/)', 'sTableHeader')}
    ${cellString('Total Generado (S/)', 'sTableHeader')}
   </Row>
   ${
     profRows.length === 0
       ? `<Row ss:Height="20">${cellString('Sin sesiones registradas en este período.', 'sCell', 5)}</Row>`
       : profRows
           .map(
             (p) => `<Row ss:Height="20">
    ${cellString(p.name, 'sCellBold')}
    ${cellString(p.role, 'sCell')}
    ${cellNumber(p.sessions, 'sInt')}
    ${cellNumber(p.serviceIncome, 'sCurrency')}
    ${cellNumber(p.productsIncome, 'sCurrency')}
    ${cellNumber(p.total, 'sCurrency')}
   </Row>`
           )
           .join('\n   ')
   }
   <Row ss:Height="23">
    ${cellString('TOTAL EQUIPO ADRANNA', 'sTotalLabel', 1)}
    ${cellNumber(sortedApts.length, 'sTotalInt')}
    ${cellNumber(podoServiceIncome + spaServiceIncome, 'sTotalCurrency')}
    ${cellNumber(totalProductsSold, 'sTotalCurrency')}
    ${cellNumber(totalIncome, 'sTotalCurrency')}
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob(['\uFEFF', xml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeDate = new Date().toISOString().slice(0, 10);
  const safePeriod = periodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  a.href = url;
  a.download = `Cuadre_Caja_Adranna_${safePeriod}_${safeDate}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
