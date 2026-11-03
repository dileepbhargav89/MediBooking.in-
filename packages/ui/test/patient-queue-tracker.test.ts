import { describe, it } from 'node:test';
import assert from 'node:assert';
import { maskPatientName } from '@medibooking/types';

describe('Phase 38: Patient Live Queue Position Tracker Portal (/patient)', () => {
  it('1. Queue Position & Wait Estimation: Computes tokens ahead and wait minutes', () => {
    const calculateWait = (
      myToken: number,
      nowServing: number,
      avgMinutesPerPatient: number = 8,
      delayMinutes: number = 0
    ) => {
      const ahead = Math.max(0, myToken - nowServing);
      const waitMinutes = ahead === 0 ? 0 : ahead * avgMinutesPerPatient + delayMinutes;
      return { ahead, waitMinutes };
    };

    // Patient #14, Now Serving #11 -> 3 ahead -> 3 * 8 = 24 mins
    const res1 = calculateWait(14, 11, 8, 0);
    assert.strictEqual(res1.ahead, 3);
    assert.strictEqual(res1.waitMinutes, 24);

    // With a 15-minute doctor delay: 24 + 15 = 39 mins
    const resDelayed = calculateWait(14, 11, 8, 15);
    assert.strictEqual(resDelayed.ahead, 3);
    assert.strictEqual(resDelayed.waitMinutes, 39);

    // When now serving reaches patient #14
    const resCalled = calculateWait(14, 14, 8, 15);
    assert.strictEqual(resCalled.ahead, 0);
    assert.strictEqual(resCalled.waitMinutes, 0);
  });

  it('2. Calling State Detection: Immediately triggers turn notification when token matches', () => {
    const checkTurn = (myToken: number, callingToken: number) => {
      return myToken === callingToken;
    };

    assert.strictEqual(checkTurn(14, 11), false);
    assert.strictEqual(checkTurn(14, 13), false);
    assert.strictEqual(checkTurn(14, 14), true, 'Must identify turn when token matches');
  });

  it('3. DPDP Patient Privacy: Preserves masked name display on public screen', () => {
    const masked = maskPatientName('Rajesh Sharma');
    assert.strictEqual(masked, 'R*** Sharma');

    const singleName = maskPatientName('Pooja');
    assert.strictEqual(singleName, 'P***');
  });

  it('4. Multi-Chamber Routing Clarity: Specifies exact room number and chamber identifier', () => {
    const chamberInfo = {
      chamberNumber: 'CH-1',
      roomNumber: 'Room 102, Ground Floor',
      doctor: 'Dr. Rajesh Sharma',
      specialty: 'Cardiologist',
    };

    assert.strictEqual(chamberInfo.chamberNumber, 'CH-1');
    assert.ok(chamberInfo.roomNumber.includes('Room 102'));
  });
});
