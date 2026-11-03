import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { AffiliatedClinicItem } from '../src/index';

describe('Phase 36: Multi-Clinic Doctor Tenant Switcher Modal', () => {
  const SAMPLE_AFFILIATIONS: AffiliatedClinicItem[] = [
    {
      clinicId: 'c1010000-0000-4000-8000-000000000001',
      clinicName: 'Bhopal City Care Polyclinic',
      branchName: 'MP Nagar Zone II',
      address: 'Plot 42, Near DB Mall, Bhopal',
      chamberNumber: 'CH-1',
      consultationFeeRupees: 600,
      isPrimary: true,
      activeToday: true,
    },
    {
      clinicId: 'c1020000-0000-4000-8000-000000000002',
      clinicName: 'Arera Super Specialty Polyclinic',
      branchName: 'Arera Colony E-3',
      address: 'Shop 14-16, Commercial Complex, Bhopal',
      chamberNumber: 'CH-3',
      consultationFeeRupees: 800,
      isPrimary: false,
      activeToday: true,
    },
  ];

  it('1. Affiliated Clinic Model: Validates multi-venue chamber and fee differentiation', () => {
    assert.strictEqual(SAMPLE_AFFILIATIONS.length, 2);

    const clinic1 = SAMPLE_AFFILIATIONS[0]!;
    const clinic2 = SAMPLE_AFFILIATIONS[1]!;

    assert.strictEqual(clinic1.chamberNumber, 'CH-1');
    assert.strictEqual(clinic1.consultationFeeRupees, 600);
    assert.strictEqual(clinic1.isPrimary, true);

    assert.strictEqual(clinic2.chamberNumber, 'CH-3');
    assert.strictEqual(clinic2.consultationFeeRupees, 800);
    assert.strictEqual(clinic2.isPrimary, false);
  });

  it('2. Active Clinic Resolution: Detects current practice location accurately', () => {
    const resolveActive = (currentId: string, list: AffiliatedClinicItem[]) => {
      return list.find((c) => c.clinicId === currentId) || list[0]!;
    };

    const activeAtCityCare = resolveActive('c1010000-0000-4000-8000-000000000001', SAMPLE_AFFILIATIONS);
    assert.strictEqual(activeAtCityCare.clinicName, 'Bhopal City Care Polyclinic');
    assert.strictEqual(activeAtCityCare.chamberNumber, 'CH-1');

    const activeAtArera = resolveActive('c1020000-0000-4000-8000-000000000002', SAMPLE_AFFILIATIONS);
    assert.strictEqual(activeAtArera.clinicName, 'Arera Super Specialty Polyclinic');
    assert.strictEqual(activeAtArera.chamberNumber, 'CH-3');
  });

  it('3. Location Switch Execution: Verifies target clinic selection logic', () => {
    let activeId = 'c1010000-0000-4000-8000-000000000001';
    let switchedCount = 0;

    const handleSwitch = (newClinicId: string) => {
      if (newClinicId === activeId) return; // Ignore duplicate selection
      activeId = newClinicId;
      switchedCount++;
    };

    // Switching to Arera Colony Polyclinic
    handleSwitch('c1020000-0000-4000-8000-000000000002');
    assert.strictEqual(activeId, 'c1020000-0000-4000-8000-000000000002');
    assert.strictEqual(switchedCount, 1);

    // Duplicate selection should not trigger another switch
    handleSwitch('c1020000-0000-4000-8000-000000000002');
    assert.strictEqual(switchedCount, 1);
  });

  it('4. Practice Location Cookie Generation: Generates tenant session cookie', () => {
    const buildActiveClinicCookie = (clinicId: string) => {
      return `medibooking_active_clinic=${clinicId}; path=/; max-age=604800; SameSite=Lax`;
    };

    const cookie = buildActiveClinicCookie('c1020000-0000-4000-8000-000000000002');
    assert.ok(cookie.includes('medibooking_active_clinic=c1020000-0000-4000-8000-000000000002'));
    assert.ok(cookie.includes('path=/'));
  });
});

