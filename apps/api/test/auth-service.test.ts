/**
 * Phase 2 Auth Service & Passwordless OTP Test Suite
 * Validates cryptographic OTP generation, sliding window rate-limiting,
 * multi-tenant JWT signing, role resolution, and REST API endpoints.
 */

import { authService } from '../src/services/auth-service';
import { createApiServer } from '../src/server';
import { UserRole } from '@medibooking/types';

async function runAuthTests() {
  console.log('\n--- STARTING PHASE 2 AUTH & OTP SERVICE TESTS ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Reset auth service state before test run
  authService.resetStore();

  // Test 1: Request OTP with valid Indian mobile
  const otpRes1 = await authService.requestOtp('9826011111');
  assert(otpRes1.success === true, 'Valid mobile receives OTP successfully');
  assert(otpRes1.ttlSeconds === 300, 'OTP TTL is set to exactly 300 seconds (5 mins)');
  assert(typeof otpRes1.devOtp === 'string' && otpRes1.devOtp.length === 6, 'Generated 6-digit numeric OTP');

  // Test 2: Reject invalid mobile format
  let invalidMobileThrew = false;
  try {
    await authService.requestOtp('12345');
  } catch (err: unknown) {
    invalidMobileThrew = true;
  }
  assert(invalidMobileThrew, 'Rejects invalid non-Indian mobile format');

  // Test 3: Rate Limiting (Max 3 requests in 10 minutes)
  await authService.requestOtp('9826011111'); // 2nd
  await authService.requestOtp('9826011111'); // 3rd
  let rateLimitThrew = false;
  try {
    await authService.requestOtp('9826011111'); // 4th should exceed limit
  } catch (err: unknown) {
    rateLimitThrew = (err as Error).message.includes('Rate limit exceeded');
  }
  assert(rateLimitThrew, 'Rate limit enforced after 3 OTP requests within 10-minute window');

  // Test 4: Verification with incorrect OTP fails
  const freshMobile = '9826022222';
  const otpRes2 = await authService.requestOtp(freshMobile);
  let wrongOtpThrew = false;
  try {
    await authService.verifyOtp(freshMobile, '000000');
  } catch (err: unknown) {
    wrongOtpThrew = (err as Error).message.includes('Incorrect OTP');
  }
  assert(wrongOtpThrew, 'Verification rejects incorrect OTP with 401 message');

  // Test 5: Verification with correct generated OTP succeeds and issues signed JWT
  const verifyRes = await authService.verifyOtp(freshMobile, otpRes2.devOtp!);
  assert(typeof verifyRes.token === 'string' && verifyRes.token.split('.').length === 3, 'Issues valid 3-part signed JWT');
  assert(verifyRes.userContext.mobile === freshMobile, 'UserContext contains correct mobile identity');

  // Test 6: Single-use OTP guarantee (cannot be reused)
  let reuseThrew = false;
  try {
    await authService.verifyOtp(freshMobile, otpRes2.devOtp!);
  } catch (err: unknown) {
    reuseThrew = true;
  }
  assert(reuseThrew, 'OTP is invalidated immediately after first successful use (single-use guarantee)');

  // Test 7: Dev bypass OTP 123456 works in non-production
  const bypassMobile = '9826033333';
  const bypassRes = await authService.verifyOtp(bypassMobile, '123456');
  assert(bypassRes.userContext.mobile === bypassMobile, 'Development bypass OTP 123456 accepted in non-prod');

  // Test 8: Cryptographic signature verification and tamper detection
  const validPayload = authService.verifyToken(verifyRes.token);
  assert(validPayload !== null && validPayload.mobile === freshMobile, 'Cryptographically verifies intact token signature');

  const tamperedToken = verifyRes.token.slice(0, -5) + 'XXXXX';
  const tamperedPayload = authService.verifyToken(tamperedToken);
  assert(tamperedPayload === null, 'Rejects tampered JWT with invalid HMAC signature');

  // Test 9: Multi-role resolution (Staff receptionist mobile ending with 22222)
  const staffContext = authService.resolveUserContext('9826022222');
  assert(staffContext.activeRole === UserRole.RECEPTIONIST, 'Correctly resolves RECEPTIONIST role for staff mobile');

  // Test 10: Multi-role resolution (Doctor mobile ending with 12345)
  const doctorContext = authService.resolveUserContext('9826012345');
  assert(doctorContext.activeRole === UserRole.DOCTOR, 'Correctly resolves DOCTOR role for doctor mobile');

  // Test 11: HTTP Endpoint Integration (Fastify /api/v1/auth/request-otp, /verify-otp, /me)
  const app = createApiServer();
  await app.ready();

  const httpReqOtp = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/request-otp',
    payload: { mobile: '9826077777' },
  });
  assert(httpReqOtp.statusCode === 200, 'POST /api/v1/auth/request-otp returns 200 OK');

  const httpVerify = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-otp',
    payload: { mobile: '9826077777', otp: '123456' },
  });
  assert(httpVerify.statusCode === 200, 'POST /api/v1/auth/verify-otp returns 200 OK with session token');
  const sessionToken = JSON.parse(httpVerify.payload).token;

  const httpMe = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { authorization: `Bearer ${sessionToken}` },
  });
  assert(httpMe.statusCode === 200, 'GET /api/v1/auth/me resolves authenticated user profile via Bearer JWT');

  await app.close();

  console.log(`\n--- PHASE 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});

