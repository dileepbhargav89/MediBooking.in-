import {
  ThermalPaperWidth,
  ThermalPrintOptions,
  FormattedThermalReceipt,
  ThermalSlipData,
} from '@medibooking/types';

const COLUMN_WIDTHS: Record<ThermalPaperWidth, number> = {
  '80mm': 48,
  '58mm': 32,
};

// ESC/POS Command Byte Constants (Epson Standard)
const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]), // ESC @
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]), // ESC a 2
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]), // ESC E 0
  SIZE_NORMAL: Buffer.from([GS, 0x21, 0x00]), // GS ! 0
  SIZE_DOUBLE: Buffer.from([GS, 0x21, 0x11]), // GS ! 17 (Double width + height)
  SIZE_LARGE: Buffer.from([GS, 0x21, 0x22]), // GS ! 34 (Triple width + height)
  FEED_3: Buffer.from([ESC, 0x64, 0x03]), // ESC d 3
  FEED_5: Buffer.from([ESC, 0x64, 0x05]), // ESC d 5
  CUT_FULL: Buffer.from([GS, 0x56, 0x42, 0x00]), // GS V B 0 (Feed & Full Cut)
};

export class ThermalReceiptService {
  /**
   * Helper: center text within given column width
   */
  public center(text: string, width: number): string {
    const trimmed = text.length > width ? text.slice(0, width) : text;
    const padding = Math.max(0, width - trimmed.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + trimmed + ' '.repeat(rightPad);
  }

  /**
   * Helper: align left and right key-value pairs across width
   */
  public twoColumn(left: string, right: string, width: number): string {
    const totalContentLen = left.length + right.length;
    if (totalContentLen >= width) {
      const allowedLeft = Math.max(4, width - right.length - 1);
      const truncatedLeft = left.slice(0, allowedLeft);
      return `${truncatedLeft} ${right}`;
    }
    const dotsCount = width - (left.length + right.length);
    return `${left}${' '.repeat(dotsCount)}${right}`;
  }

  /**
   * Helper: generate horizontal separator
   */
  public divider(width: number, char = '-'): string {
    return char.repeat(width);
  }

  /**
   * Generates clean plain ASCII receipt layout for terminal / text print
   */
  public generateAsciiReceipt(data: ThermalSlipData, width: ThermalPaperWidth = '80mm'): string {
    const cols = COLUMN_WIDTHS[width];
    const lines: string[] = [];

    // Header
    lines.push(this.center(data.clinicName.toUpperCase(), cols));
    lines.push(this.center(data.clinicAddress, cols));
    lines.push(this.center(`Ph: ${data.clinicPhone}`, cols));
    if (data.clinicGstNumber) {
      lines.push(this.center(`GSTIN: ${data.clinicGstNumber}`, cols));
    }
    lines.push(this.divider(cols, '='));

    // Token Section
    const tokenLabel = data.tokenFormatted || `TOKEN #${data.token}`;
    lines.push(this.center('*** PATIENT INTAKE TOKEN ***', cols));
    lines.push(this.center(`[ ${tokenLabel} ]`, cols));
    lines.push(this.center(`CHAMBER: ${data.chamber}`, cols));
    lines.push(this.divider(cols, '-'));

    // Doctor & Schedule
    lines.push(this.twoColumn('Doctor:', data.doctorName, cols));
    if (data.specialty) {
      lines.push(this.twoColumn('Specialty:', data.specialty, cols));
    }
    lines.push(this.twoColumn('Date & Time:', data.time, cols));
    lines.push(this.divider(cols, '-'));

    // Patient Details
    lines.push(this.twoColumn('Patient:', data.patientName, cols));
    lines.push(this.twoColumn('Mobile:', data.patientMaskedPhone, cols));
    lines.push(this.divider(cols, '-'));

    // Cashiering / Billing Details
    const feeStr = `Rs. ${data.feeRupees}`;
    lines.push(this.twoColumn('Consultation Fee:', feeStr, cols));
    lines.push(this.twoColumn('Payment Mode:', data.payment, cols));
    lines.push(this.twoColumn('Receipt No:', data.receiptNumber, cols));
    lines.push(this.divider(cols, '='));

    // Instructions
    if (width === '80mm') {
      lines.push(this.center('Kripya token number aane tak pratikshalay me baithein', cols));
    } else {
      lines.push(this.center('Kripya token aane tak', cols));
      lines.push(this.center('pratikshalay me baithein', cols));
    }
    lines.push(this.center('MediBooking.in - Smart Clinic Ops', cols));

    return lines.join('\n');
  }

  /**
   * Generates standard binary ESC/POS command stream buffer
   */
  public generateEscPosBuffer(data: ThermalSlipData, options: ThermalPrintOptions): Buffer {
    const cols = COLUMN_WIDTHS[options.width];
    const parts: Buffer[] = [];

    // 1. Initialize
    parts.push(CMD.INIT);

    // 2. Header (Center, Bold)
    parts.push(CMD.ALIGN_CENTER);
    parts.push(CMD.BOLD_ON);
    parts.push(Buffer.from(`${data.clinicName.toUpperCase()}\n`, 'utf-8'));
    parts.push(CMD.BOLD_OFF);
    parts.push(Buffer.from(`${data.clinicAddress}\n`, 'utf-8'));
    parts.push(Buffer.from(`Ph: ${data.clinicPhone}\n`, 'utf-8'));
    if (data.clinicGstNumber) {
      parts.push(Buffer.from(`GSTIN: ${data.clinicGstNumber}\n`, 'utf-8'));
    }
    parts.push(Buffer.from(`${this.divider(cols, '=')}\n`, 'utf-8'));

    // 3. Token Box (Double size, Bold, Centered)
    const tokenDisplay = data.tokenFormatted || `TOKEN #${data.token}`;
    parts.push(CMD.BOLD_ON);
    parts.push(Buffer.from('PATIENT INTAKE TOKEN\n', 'utf-8'));
    parts.push(CMD.SIZE_DOUBLE);
    parts.push(Buffer.from(`${tokenDisplay}\n`, 'utf-8'));
    parts.push(CMD.SIZE_NORMAL);
    parts.push(Buffer.from(`CHAMBER: ${data.chamber}\n`, 'utf-8'));
    parts.push(CMD.BOLD_OFF);
    parts.push(Buffer.from(`${this.divider(cols, '-')}\n`, 'utf-8'));

    // 4. Clinical Details (Left aligned)
    parts.push(CMD.ALIGN_LEFT);
    parts.push(Buffer.from(`${this.twoColumn('Doctor:', data.doctorName, cols)}\n`, 'utf-8'));
    if (data.specialty) {
      parts.push(Buffer.from(`${this.twoColumn('Specialty:', data.specialty, cols)}\n`, 'utf-8'));
    }
    parts.push(Buffer.from(`${this.twoColumn('Date & Time:', data.time, cols)}\n`, 'utf-8'));
    parts.push(Buffer.from(`${this.divider(cols, '-')}\n`, 'utf-8'));

    // 5. Patient Info
    parts.push(Buffer.from(`${this.twoColumn('Patient:', data.patientName, cols)}\n`, 'utf-8'));
    parts.push(Buffer.from(`${this.twoColumn('Mobile:', data.patientMaskedPhone, cols)}\n`, 'utf-8'));
    parts.push(Buffer.from(`${this.divider(cols, '-')}\n`, 'utf-8'));

    // 6. Financial Ledger / Cashiering
    parts.push(CMD.BOLD_ON);
    parts.push(Buffer.from(`${this.twoColumn('Fee Amount:', `Rs. ${data.feeRupees}`, cols)}\n`, 'utf-8'));
    parts.push(CMD.BOLD_OFF);
    parts.push(Buffer.from(`${this.twoColumn('Payment Mode:', data.payment, cols)}\n`, 'utf-8'));
    parts.push(Buffer.from(`${this.twoColumn('Receipt No:', data.receiptNumber, cols)}\n`, 'utf-8'));
    parts.push(Buffer.from(`${this.divider(cols, '=')}\n`, 'utf-8'));

    // 7. Footer
    parts.push(CMD.ALIGN_CENTER);
    parts.push(Buffer.from('Kripya token aane par chamber me jayein\n', 'utf-8'));
    parts.push(Buffer.from('Powered by MediBooking.in\n', 'utf-8'));

    // 8. Feed and Paper Cut
    if (options.cutPaper !== false) {
      parts.push(CMD.FEED_5);
      parts.push(CMD.CUT_FULL);
    } else {
      parts.push(CMD.FEED_3);
    }

    return Buffer.concat(parts);
  }

  /**
   * Generates pixel-perfect printable HTML thermal slip with CSS @media print
   */
  public generateHtmlReceipt(data: ThermalSlipData, width: ThermalPaperWidth = '80mm'): string {
    const maxPx = width === '80mm' ? '280px' : '200px';
    const tokenDisplay = data.tokenFormatted || `TOKEN #${data.token}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Receipt - ${data.receiptNumber}</title>
<style>
  @page {
    size: ${width} auto;
    margin: 0;
  }
  body {
    width: ${maxPx};
    margin: 0 auto;
    padding: 8px;
    font-family: 'Courier New', Courier, monospace;
    font-size: ${width === '80mm' ? '12px' : '10px'};
    line-height: 1.3;
    color: #000000;
    background: #ffffff;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000000; margin: 6px 0; }
  .double-divider { border-top: 2px solid #000000; margin: 6px 0; }
  .token-box {
    border: 2px solid #000000;
    padding: 6px;
    margin: 6px 0;
    text-align: center;
  }
  .token-number {
    font-size: ${width === '80mm' ? '22px' : '16px'};
    font-weight: 900;
    letter-spacing: 1px;
  }
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px 0;
  }
  .row .label { color: #333333; }
  .row .val { font-weight: bold; text-align: right; }
  @media print {
    body { width: 100%; padding: 4px; }
  }
</style>
</head>
<body>
  <div class="center bold" style="font-size: 14px;">${data.clinicName.toUpperCase()}</div>
  <div class="center">${data.clinicAddress}</div>
  <div class="center">Ph: ${data.clinicPhone}</div>
  ${data.clinicGstNumber ? `<div class="center">GSTIN: ${data.clinicGstNumber}</div>` : ''}
  <div class="double-divider"></div>

  <div class="token-box">
    <div style="font-size: 10px; text-transform: uppercase;">Patient Intake Token</div>
    <div class="token-number">${tokenDisplay}</div>
    <div class="bold">CHAMBER: ${data.chamber}</div>
  </div>

  <div class="divider"></div>
  <div class="row"><span class="label">Doctor:</span><span class="val">${data.doctorName}</span></div>
  ${data.specialty ? `<div class="row"><span class="label">Specialty:</span><span class="val">${data.specialty}</span></div>` : ''}
  <div class="row"><span class="label">Date & Time:</span><span class="val">${data.time}</span></div>

  <div class="divider"></div>
  <div class="row"><span class="label">Patient:</span><span class="val">${data.patientName}</span></div>
  <div class="row"><span class="label">Mobile:</span><span class="val">${data.patientMaskedPhone}</span></div>

  <div class="divider"></div>
  <div class="row"><span class="label">Consultation Fee:</span><span class="val">₹ ${data.feeRupees}</span></div>
  <div class="row"><span class="label">Payment Mode:</span><span class="val">${data.payment}</span></div>
  <div class="row"><span class="label">Receipt No:</span><span class="val">${data.receiptNumber}</span></div>
  <div class="double-divider"></div>

  <div class="center" style="font-size: 9px; margin-top: 6px;">
    Kripya token number aane tak pratikshalay me baithein.<br/>
    <b>MediBooking.in - Smart Polyclinic Ops</b>
  </div>
</body>
</html>`;
  }

  /**
   * Combined high-level formatting helper
   */
  public formatReceipt(
    data: ThermalSlipData,
    options?: Partial<ThermalPrintOptions>
  ): FormattedThermalReceipt {
    const width: ThermalPaperWidth = options?.width || '80mm';
    const cutPaper = options?.cutPaper ?? true;
    const cols = COLUMN_WIDTHS[width];

    const asciiText = this.generateAsciiReceipt(data, width);
    const escposBuffer = this.generateEscPosBuffer(data, { width, cutPaper });
    const htmlContent = this.generateHtmlReceipt(data, width);

    return {
      width,
      columns: cols,
      rawEscPosBase64: escposBuffer.toString('base64'),
      asciiText,
      htmlContent,
    };
  }
}

export const thermalReceiptService = new ThermalReceiptService();
