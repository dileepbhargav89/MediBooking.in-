import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { thermalReceiptService } from '../src/services/thermal-receipt-service';
import { createApiServer } from '../src/server';
import { ThermalSlipData, PaymentStatus } from '@medibooking/types';

describe('Phase 28: 80mm & 58mm Thermal Printer ESC/POS Receipt Formatter', () => {
  const sampleSlip: ThermalSlipData = {
    clinicName: 'Apex Care Polyclinic & Diagnostics',
    clinicAddress: 'Plot 42, MP Nagar Zone-II, Bhopal',
    clinicPhone: '+91-755-4091234',
    clinicGstNumber: '23AAAAA0000A1Z5',
    chamber: 'CH-1',
    chamberName: 'Cardiology Consultation Suite',
    doctorName: 'Dr. Rajesh Sharma',
    specialty: 'Cardiology',
    token: 14,
    tokenFormatted: 'CH1-014',
    patientName: 'Devendra Patel',
    patientMaskedPhone: '98261*****',
    feeRupees: 700,
    payment: PaymentStatus.PAID_CASH,
    receiptNumber: 'RCP-20261104-0014',
    time: '2026-11-04 10:30 AM',
  };

  it('1. Column width formatting: 80mm adheres to 48 columns, 58mm adheres to 32 columns', () => {
    const ascii80 = thermalReceiptService.generateAsciiReceipt(sampleSlip, '80mm');
    const lines80 = ascii80.split('\n');
    for (const line of lines80) {
      assert.ok(
        line.length <= 48,
        `Line exceeded 80mm (48 chars) limit: "${line}" (length: ${line.length})`
      );
    }
    assert.ok(ascii80.includes('CH1-014'));
    assert.ok(ascii80.includes('Dr. Rajesh Sharma'));
    assert.ok(ascii80.includes('Rs. 700'));
    assert.ok(ascii80.includes('PAID_CASH'));

    const ascii58 = thermalReceiptService.generateAsciiReceipt(sampleSlip, '58mm');
    const lines58 = ascii58.split('\n');
    for (const line of lines58) {
      assert.ok(
        line.length <= 32,
        `Line exceeded 58mm (32 chars) limit: "${line}" (length: ${line.length})`
      );
    }
    assert.ok(ascii58.includes('CH1-014'));
    assert.ok(ascii58.includes('Rs. 700'));
  });

  it('2. ESC/POS command sequences: includes init, bold, double-size token, and paper cut opcodes', () => {
    // Standard with cut
    const bufWithCut = thermalReceiptService.generateEscPosBuffer(sampleSlip, {
      width: '80mm',
      cutPaper: true,
    });
    assert.ok(Buffer.isBuffer(bufWithCut));

    // ESC @ (Init) = 0x1B 0x40
    assert.equal(bufWithCut[0], 0x1b);
    assert.equal(bufWithCut[1], 0x40);

    // GS ! 0x11 (Double size for token)
    const doubleSizeIndex = bufWithCut.indexOf(Buffer.from([0x1d, 0x21, 0x11]));
    assert.ok(doubleSizeIndex > 0, 'Buffer must contain double-size character command');

    // Token string must follow double size command
    const tokenBufferIndex = bufWithCut.indexOf(Buffer.from('CH1-014'));
    assert.ok(tokenBufferIndex > doubleSizeIndex, 'Token text must appear after double-size command');

    // GS V B 0 (Cut paper) = 0x1D 0x56 0x42 0x00
    const cutIndex = bufWithCut.indexOf(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    assert.ok(cutIndex > 0, 'Buffer must contain GS V paper cut command');

    // Without cut
    const bufNoCut = thermalReceiptService.generateEscPosBuffer(sampleSlip, {
      width: '80mm',
      cutPaper: false,
    });
    const noCutIndex = bufNoCut.indexOf(Buffer.from([0x1d, 0x56, 0x42, 0x00]));
    assert.equal(noCutIndex, -1, 'Buffer should not have cut command when cutPaper is false');
  });

  it('3. HTML receipt generator produces valid CSS print stylesheet with exact paper widths', () => {
    const html80 = thermalReceiptService.generateHtmlReceipt(sampleSlip, '80mm');
    assert.ok(html80.includes('size: 80mm auto;'));
    assert.ok(html80.includes('@media print'));
    assert.ok(html80.includes('CH1-014'));
    assert.ok(html80.includes('Dr. Rajesh Sharma'));
    assert.ok(html80.includes('₹ 700'));
    assert.ok(html80.includes('RCP-20261104-0014'));
    assert.ok(html80.includes('23AAAAA0000A1Z5'));

    const html58 = thermalReceiptService.generateHtmlReceipt(sampleSlip, '58mm');
    assert.ok(html58.includes('size: 58mm auto;'));
    assert.ok(html58.includes('width: 200px;'));
  });

  it('4. Combined formatReceipt delivers unified DTO with ASCII, HTML, and base64 ESC/POS', () => {
    const formatted = thermalReceiptService.formatReceipt(sampleSlip, { width: '80mm' });
    assert.equal(formatted.width, '80mm');
    assert.equal(formatted.columns, 48);
    assert.ok(typeof formatted.asciiText === 'string');
    assert.ok(typeof formatted.htmlContent === 'string');
    assert.ok(typeof formatted.rawEscPosBase64 === 'string');

    // Decode base64 to ensure it can roundtrip
    const decoded = Buffer.from(formatted.rawEscPosBase64, 'base64');
    assert.equal(decoded[0], 0x1b);
    assert.equal(decoded[1], 0x40);
  });

  it('5. REST API: POST /reception/thermal-receipt/preview and /escpos endpoints', async () => {
    const server = await createApiServer();

    // 1. Preview 80mm
    const prev80 = await server.inject({
      method: 'POST',
      url: '/api/v1/reception/thermal-receipt/preview',
      payload: { ...sampleSlip, width: '80mm' },
    });
    assert.equal(prev80.statusCode, 200);
    const body80 = JSON.parse(prev80.body);
    assert.equal(body80.success, true);
    assert.equal(body80.formatted.width, '80mm');
    assert.equal(body80.formatted.columns, 48);

    // 2. Preview 58mm
    const prev58 = await server.inject({
      method: 'POST',
      url: '/api/v1/reception/thermal-receipt/preview',
      payload: { ...sampleSlip, width: '58mm' },
    });
    assert.equal(prev58.statusCode, 200);
    const body58 = JSON.parse(prev58.body);
    assert.equal(body58.formatted.width, '58mm');
    assert.equal(body58.formatted.columns, 32);

    // 3. Binary ESC/POS Endpoint
    const escposRes = await server.inject({
      method: 'POST',
      url: '/api/v1/reception/thermal-receipt/escpos',
      payload: { ...sampleSlip, width: '80mm' },
    });
    assert.equal(escposRes.statusCode, 200);
    assert.equal(escposRes.headers['content-type'], 'application/octet-stream');
    assert.ok(
      String(escposRes.headers['content-disposition']).includes('RCP-20261104-0014')
    );
    const rawBuf = escposRes.rawPayload;
    assert.equal(rawBuf[0], 0x1b);
    assert.equal(rawBuf[1], 0x40);

    // 4. Bad request rejection
    const badRes = await server.inject({
      method: 'POST',
      url: '/api/v1/reception/thermal-receipt/preview',
      payload: {},
    });
    assert.equal(badRes.statusCode, 400);

    await server.close();
  });
});

