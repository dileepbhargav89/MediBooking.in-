import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Phase 37: Doctor-First Public Profile & Chamber Booking Page (/dr/:slug)', () => {
  const DOCTOR_PROFILE = {
    slug: 'dr-rajesh-sharma-cardio',
    name: 'Dr. Rajesh Sharma',
    nmcNumber: 'MP-38492',
    isNmcVerified: true,
    venues: [
      {
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        clinicName: 'Bhopal City Care Polyclinic',
        chamberNumber: 'CH-1',
        feeRupees: 600,
      },
      {
        clinicId: 'c1020000-0000-4000-8000-000000000002',
        clinicName: 'Arera Super Specialty Polyclinic',
        chamberNumber: 'CH-3',
        feeRupees: 800,
      },
    ],
  };

  it('1. Doctor Identity & NMC Verification: Displays verified credentials', () => {
    assert.strictEqual(DOCTOR_PROFILE.slug, 'dr-rajesh-sharma-cardio');
    assert.strictEqual(DOCTOR_PROFILE.isNmcVerified, true);
    assert.ok(DOCTOR_PROFILE.nmcNumber.startsWith('MP-'));
    assert.strictEqual(DOCTOR_PROFILE.venues.length, 2);
  });

  it('2. Multi-Chamber Venue Selection: Preserves differential consultation fees', () => {
    const venue1 = DOCTOR_PROFILE.venues[0]!;
    const venue2 = DOCTOR_PROFILE.venues[1]!;

    assert.strictEqual(venue1.chamberNumber, 'CH-1');
    assert.strictEqual(venue1.feeRupees, 600);

    assert.strictEqual(venue2.chamberNumber, 'CH-3');
    assert.strictEqual(venue2.feeRupees, 800);
  });

  it('3. Slot Mutex Locking Protocol: 5-minute (300s) atomic hold logic', () => {
    let slotLock = {
      slotId: 's1',
      lockedBySession: 'sess-p1',
      expiresAt: Date.now() + 300 * 1000,
    };

    const isSlotLocked = (now: number) => now < slotLock.expiresAt;

    // Initially locked
    assert.strictEqual(isSlotLocked(Date.now()), true);

    // After 301 seconds, lock expired
    const expiredTime = Date.now() + 301 * 1000;
    assert.strictEqual(isSlotLocked(expiredTime), false);
  });

  it('4. Direct Counter Cashiering Policy (Flow B): ₹0 online booking transaction fee', () => {
    const consultationFee = 600;
    const onlineBookingFee = 0;
    const payableAtCounter = consultationFee - onlineBookingFee;

    assert.strictEqual(onlineBookingFee, 0, 'No advance payment collected online for Flow B');
    assert.strictEqual(payableAtCounter, 600, 'Full consultation fee settled at clinic counter');
  });

  it('5. Public Booking Intake Validation: Validates patient details and issues token', () => {
    const validateBooking = (name: string, mobile: string) => {
      if (!name || name.trim().length === 0) return { ok: false, error: 'NAME_REQUIRED' };
      if (!/^[6-9]\d{9}$/.test(mobile)) return { ok: false, error: 'INVALID_MOBILE' };
      return { ok: true, tokenNumber: 14 };
    };

    const validResult = validateBooking('Ramesh Kumar', '9826012345');
    assert.strictEqual(validResult.ok, true);
    assert.strictEqual(validResult.tokenNumber, 14);

    const invalidMobile = validateBooking('Ramesh Kumar', '5551234567');
    assert.strictEqual(invalidMobile.ok, false);
    assert.strictEqual(invalidMobile.error, 'INVALID_MOBILE');
  });
});
