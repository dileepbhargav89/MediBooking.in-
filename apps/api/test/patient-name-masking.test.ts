import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskPatientName,
  maskIndianMobile,
  maskPatientIdentity,
} from '@medibooking/types';
import { createApiServer } from '../src/server';

describe('Phase 30: Public Display Patient Name Masking Utility (R*** Sharma)', () => {
  it('1. Standard two-word names mask the first name and preserve surname (R*** Sharma)', () => {
    assert.equal(maskPatientName('Rajesh Sharma'), 'R*** Sharma');
    assert.equal(maskPatientName('Amit Kumar'), 'A*** Kumar');
    assert.equal(maskPatientName('Devendra Patel'), 'D*** Patel');
    assert.equal(maskPatientName('Priya Sen'), 'P*** Sen');
  });

  it('2. Common Indian honorifics are automatically stripped prior to masking', () => {
    assert.equal(maskPatientName('Dr. Rajesh Sharma'), 'R*** Sharma');
    assert.equal(maskPatientName('Dr Rajesh Sharma'), 'R*** Sharma');
    assert.equal(maskPatientName('Mrs. Sunita Rao'), 'S*** Rao');
    assert.equal(maskPatientName('Mr. Arvind Gupta'), 'A*** Gupta');
    assert.equal(maskPatientName('Shri Ram Prakash'), 'R*** Prakash');
    assert.equal(maskPatientName('Smt. Meena Kumari'), 'M*** Kumari');
    assert.equal(maskPatientName('Dr. Devendra'), 'D***');
  });

  it('3. Single-word names mask correctly without failing or dropping initials', () => {
    assert.equal(maskPatientName('Pooja'), 'P***');
    assert.equal(maskPatientName('Anil'), 'A***');
    assert.equal(maskPatientName('Kavita'), 'K***');
    assert.equal(maskPatientName('G'), 'G***');
    assert.equal(maskPatientName(''), '');
    assert.equal(maskPatientName('   '), '');
  });

  it('4. Multi-word (3+ tokens) names mask first initial and preserve final surname', () => {
    assert.equal(maskPatientName('Mohammad Abdul Kalam'), 'M*** Kalam');
    assert.equal(maskPatientName('Shashi Kant Sharma'), 'S*** Sharma');
    assert.equal(maskPatientName('Lt. Col. Ajay Kumar Singh'), 'A*** Singh');
  });

  it('5. Style variations support INITIALS_ONLY and FULL_SURNAME_MASK', () => {
    // INITIALS_ONLY
    assert.equal(
      maskPatientName('Rajesh Sharma', { style: 'INITIALS_ONLY' }),
      'R*** S***'
    );
    // FULL_SURNAME_MASK
    assert.equal(
      maskPatientName('Rajesh Sharma', { style: 'FULL_SURNAME_MASK' }),
      'Rajesh S***'
    );
  });

  it('6. Indian mobile masking exposes exactly first 5 digits and masks remaining 5', () => {
    assert.equal(maskIndianMobile('9826012345'), '98260*****');
    assert.equal(maskIndianMobile('+919826012345'), '98260*****');
    assert.equal(maskIndianMobile('09826012345'), '98260*****');
    assert.equal(maskIndianMobile('+91 98260-12345'), '98260*****');
    assert.equal(maskIndianMobile(''), '');
  });

  it('7. Unified maskPatientIdentity helper structures complete identity card', () => {
    const identity = maskPatientIdentity('Dr. Rajesh Sharma', '+91 98260-12345');
    assert.equal(identity.originalName, 'Dr. Rajesh Sharma');
    assert.equal(identity.maskedName, 'R*** Sharma');
    assert.equal(identity.originalMobile, '+91 98260-12345');
    assert.equal(identity.maskedMobile, '98260*****');
  });

  it('8. REST API: POST /api/v1/public/masking/preview endpoint', async () => {
    const server = await createApiServer();

    // 1. Valid preview
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/public/masking/preview',
      payload: {
        name: 'Devendra Patel',
        mobile: '9826112345',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.success, true);
    assert.equal(body.identity.maskedName, 'D*** Patel');
    assert.equal(body.identity.maskedMobile, '98261*****');

    // 2. Missing name validation
    const badRes = await server.inject({
      method: 'POST',
      url: '/api/v1/public/masking/preview',
      payload: {},
    });
    assert.equal(badRes.statusCode, 400);

    await server.close();
  });
});

