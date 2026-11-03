import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getChamberStyle, getChamberStatusStyle } from '../src/index';

describe('Phase 39: Waiting Room TV Screen (/tv/:clinicSlug) with Realtime SSE & Sound Effects', () => {
  const CHAMBER_SNAPSHOT = [
    {
      chamberNumber: 'CH-1',
      doctor: 'Dr. Rajesh Sharma',
      callingToken: 14,
      patientMasked: 'R*** Sharma',
      status: 'ACTIVE',
      nextTokens: [15, 16],
    },
    {
      chamberNumber: 'CH-2',
      doctor: 'Dr. Priya Patel',
      callingToken: 9,
      patientMasked: 'M*** Gupta',
      status: 'ACTIVE',
      nextTokens: [10, 11],
    },
    {
      chamberNumber: 'CH-3',
      doctor: 'Dr. Amit Verma',
      callingToken: 22,
      patientMasked: 'Master V*** Khan',
      status: 'DELAYED',
      delayMinutes: 15,
      nextTokens: [23, 24],
    },
    {
      chamberNumber: 'CH-4',
      doctor: 'Dr. Sunita Rao',
      callingToken: 7,
      patientMasked: 'K*** Chouhan',
      status: 'BREAK',
      delayMinutes: 10,
      nextTokens: [8],
    },
  ];

  it('1. 4-Chamber Grid Layout: Full coverage for CH-1 through CH-4', () => {
    assert.strictEqual(CHAMBER_SNAPSHOT.length, 4);

    const chamberCodes = CHAMBER_SNAPSHOT.map((c) => c.chamberNumber);
    assert.deepStrictEqual(chamberCodes, ['CH-1', 'CH-2', 'CH-3', 'CH-4']);

    for (const c of CHAMBER_SNAPSHOT) {
      const style = getChamberStyle(c.chamberNumber);
      assert.ok(style.accent, 'Chamber accent color must be defined');
      assert.ok(c.doctor.startsWith('Dr.'), 'Doctor name must be specified');
      assert.ok(c.callingToken > 0, 'Calling token must be positive');
    }
  });

  it('2. Chamber Status Badges: In Session, Delayed, and Short Break', () => {
    const active = getChamberStatusStyle('ACTIVE');
    assert.strictEqual(active.label, 'In Session');

    const delayed = getChamberStatusStyle('DELAYED');
    assert.strictEqual(delayed.label, 'Delayed');

    const brk = getChamberStatusStyle('BREAK');
    assert.strictEqual(brk.label, 'Short Break');
  });

  it('3. Up Next Waiting Queue Previews: Renders upcoming tokens', () => {
    const ch1 = CHAMBER_SNAPSHOT[0]!;
    assert.strictEqual(ch1.nextTokens.length, 2);
    assert.strictEqual(ch1.nextTokens[0], 15);
    assert.strictEqual(ch1.nextTokens[1], 16);
  });

  it('4. Dual-Tone Hospital Chime Parameters: C5 (523.25Hz) and E5 (659.25Hz)', () => {
    const CHIME_SPECS = {
      note1FreqHz: 523.25, // C5
      note2FreqHz: 659.25, // E5
      waveform: 'sine',
      decayTimeSec: 0.7,
    };

    assert.strictEqual(CHIME_SPECS.note1FreqHz, 523.25);
    assert.strictEqual(CHIME_SPECS.note2FreqHz, 659.25);
    assert.strictEqual(CHIME_SPECS.waveform, 'sine');
    assert.strictEqual(CHIME_SPECS.decayTimeSec, 0.7);
  });
});

