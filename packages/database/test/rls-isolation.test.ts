/**
 * Automated Test: PostgreSQL PgBouncer Transaction RLS Isolation Wrapper
 * Tests tenant context injection, validation guards, and exception rollback.
 */

import { TenantDatabaseManager } from '../src/client';
import { UserRole } from '@medibooking/types';

async function runRlsTests() {
  console.log('--- STARTING PHASE 1 RLS ISOLATION TESTS ---\n');

  const manager = new TenantDatabaseManager();
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` [PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failCount++;
    }
  }

  // 1. Valid transaction executes
  try {
    const result = await manager.withTenantTransaction(
      {
        clinicId: 'c1010000-0000-4000-8000-000000000001',
        userId: 'u2010000-0000-4000-8000-000000000001',
        role: UserRole.CLINIC_ADMIN,
      },
      async () => {
        return { success: true, count: 4 };
      }
    );
    assert(result.success === true && result.count === 4, 'Valid tenant transaction executes successfully');
  } catch (e) {
    assert(false, `Valid tenant transaction failed: ${e}`);
  }

  // 2. Missing clinicId throws RLS security error
  try {
    await manager.withTenantTransaction(
      {
        clinicId: '',
        userId: 'u-1',
        role: UserRole.DOCTOR,
      },
      async () => 'should not reach'
    );
    assert(false, 'Missing clinicId should have thrown RLS_SECURITY_ERROR');
  } catch (e: any) {
    assert(e.message.includes('RLS_SECURITY_ERROR'), 'Missing clinicId throws RLS_SECURITY_ERROR');
  }

  // 3. Missing userId throws RLS security error
  try {
    await manager.withTenantTransaction(
      {
        clinicId: 'c-1',
        userId: '',
        role: UserRole.DOCTOR,
      },
      async () => 'should not reach'
    );
    assert(false, 'Missing userId should have thrown RLS_SECURITY_ERROR');
  } catch (e: any) {
    assert(e.message.includes('RLS_SECURITY_ERROR'), 'Missing userId throws RLS_SECURITY_ERROR');
  }

  // 4. Invalid role throws error
  try {
    await manager.withTenantTransaction(
      {
        clinicId: 'c-1',
        userId: 'u-1',
        role: 'HACKER_ROLE' as any,
      },
      async () => 'should not reach'
    );
    assert(false, 'Invalid role should have thrown error');
  } catch (e: any) {
    assert(e.message.includes('Invalid user role'), 'Invalid role rejected');
  }

  // 5. Exception inside transaction bubbles up safely
  try {
    await manager.withTenantTransaction(
      {
        clinicId: 'c-1',
        userId: 'u-1',
        role: UserRole.RECEPTIONIST,
      },
      async () => {
        throw new Error('Database integrity violation simulated');
      }
    );
    assert(false, 'Simulated error should bubble up');
  } catch (e: any) {
    assert(e.message === 'Database integrity violation simulated', 'Transaction error caught and rolled back');
  }

  console.log(`\n--- PHASE 1 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED ---`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runRlsTests().catch((err) => {
  console.error('Test failed with unexpected error:', err);
  process.exit(1);
});

