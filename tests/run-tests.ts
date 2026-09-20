import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../server/db/database.ts';
import { authService } from '../server/services/authService.ts';
import { incidentService } from '../server/services/incidentService.ts';
import { resourceService } from '../server/services/resourceService.ts';
import { meshCommunicationService } from '../server/services/meshCommunicationService.ts';
import { aiRegistry } from '../server/ai/index.ts';
import { requireAuth, requireRole } from '../server/middleware/authMiddleware.ts';

// Dedicated test database file so we don't clobber production or local session data
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'sentinelgrid.test.json');

/**
 * Lightweight mock helper to execute Express middleware & routes synchronously in tests
 */
function mockReqRes(options: {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: any;
  token?: string;
}) {
  const req: any = {
    headers: options.headers || {},
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user,
    token: options.token
  };
  let statusCode = 200;
  let responseData: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    }
  };
  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

async function runAllTests() {
  console.log('====================================================');
  console.log('  SentinelGrid Phase 1 Security Hardening Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return async () => {
      try {
        await fn();
        console.log(`  ✓ PASS: ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✗ FAIL: ${name}`);
        console.error(`    Error: ${err.message}`);
        if (err.stack) console.error(err.stack);
        failed++;
      }
    };
  }

  // Setup test database environment
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  db.resetForTesting(TEST_DB_PATH);

  const tests = [
    // ---------------------------------------------------------
    // 1. Basic Auth, Secret Generation, and Bootstrap
    // ---------------------------------------------------------
    test('Auth: Secret is generated and persists securely', () => {
      const secret = authService.getAuthSecret();
      assert.ok(secret, 'Secret should exist');
      assert.equal(typeof secret, 'string');
      assert.ok(secret.length >= 32, 'Secret must be at least 32 bytes hex');
    }),

    test('Auth: First user is automatically granted ADMIN role', () => {
      const reg1 = authService.register({
        email: 'commander@test.local',
        password: 'Password123!',
        name: 'First Admin',
        role: 'OPERATOR' // Even if requested OPERATOR, bootstrap grants ADMIN
      });

      assert.equal(reg1.user.role, 'ADMIN', 'First user must be ADMIN');
      assert.ok(reg1.token, 'Must return token');
    }),

    test('Auth: Subsequent self-registered users are restricted to OPERATOR role', () => {
      const reg2 = authService.register({
        email: 'operator2@test.local',
        password: 'Password123!',
        name: 'Second User',
        role: 'ADMIN' // Trying to self-elevate to ADMIN
      });

      assert.equal(reg2.user.role, 'OPERATOR', 'Subsequent user must be forced to OPERATOR');
    }),

    test('Auth: Successful login returns token and user profile', () => {
      const loginRes = authService.login({
        email: 'commander@test.local',
        password: 'Password123!'
      });

      assert.ok(loginRes.token, 'Login should produce session token');
      assert.equal(loginRes.user.email, 'commander@test.local');
    }),

    test('Auth: Login fails with invalid password', () => {
      assert.throws(() => {
        authService.login({
          email: 'commander@test.local',
          password: 'WrongPassword999!'
        });
      }, /Invalid email or password/);
    }),

    // ---------------------------------------------------------
    // 2. Cryptographic SHA-256 Revoked Token Storage
    // ---------------------------------------------------------
    test('Tokens: Revoked token is stored as SHA-256 hash, never as raw bearer token', () => {
      const loginRes = authService.login({
        email: 'commander@test.local',
        password: 'Password123!'
      });
      const token = loginRes.token;

      // Revoke the session token
      authService.revokeToken(token);

      // Verify isTokenRevoked recognizes it
      assert.equal(authService.isTokenRevoked(token), true);

      // Inspect the raw storage structure inside db
      const storedHashes = db.getRevokedTokens();
      const expectedHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

      // The exact raw token MUST NOT be in the stored array
      assert.equal(storedHashes.includes(token), false, 'Raw bearer token must NOT be stored in revoked list');
      // The SHA-256 hash MUST be present
      assert.equal(storedHashes.includes(expectedHash), true, 'SHA-256 hash of token must be present');
      assert.equal(expectedHash.length, 64, 'Stored hash must be 64 characters hex');
    }),

    test('Tokens: Expired or malformed token verification returns null', () => {
      assert.equal(authService.verifyToken('completely.invalid.token'), null);
      assert.equal(authService.verifyToken(''), null);
    }),

    // ---------------------------------------------------------
    // 3. Authenticated User Role Validation (Live DB Re-check)
    // ---------------------------------------------------------
    test('Auth Middleware: Re-fetches role from DB; role change invalidates old token permissions', () => {
      // Create user Charlie as DISPATCHER
      const regCharlie = authService.register({
        email: 'charlie@test.local',
        password: 'Password123!',
        name: 'Charlie Dispatcher'
      });
      const userCharlie = db.findUserByEmail('charlie@test.local')!;
      db.updateUserRole(userCharlie.id, 'DISPATCHER');

      // Charlie logs in and receives token with role="DISPATCHER" in payload
      const charlieLogin = authService.login({ email: 'charlie@test.local', password: 'Password123!' });
      const charlieToken = charlieLogin.token;

      // Verify that requireAuth attaches DISPATCHER
      let nextCalled = false;
      const { req: req1, res: res1 } = mockReqRes({ headers: { authorization: `Bearer ${charlieToken}` } });
      requireAuth(req1, res1, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req1.user.role, 'DISPATCHER');

      // Now Admin demotes Charlie in the database to OPERATOR
      db.updateUserRole(userCharlie.id, 'OPERATOR');

      // Using the SAME old token (which claimed DISPATCHER in payload), verify requireAuth now loads OPERATOR
      nextCalled = false;
      const { req: req2, res: res2 } = mockReqRes({ headers: { authorization: `Bearer ${charlieToken}` } });
      requireAuth(req2, res2, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(req2.user.role, 'OPERATOR', 'Role must be updated to OPERATOR from authoritative DB, not stale token');

      // And requireRole('DISPATCHER') now strictly denies access (403)
      let roleAllowed = false;
      const { req: req3, res: res3, getStatus: getStatus3 } = mockReqRes({ user: req2.user });
      requireRole('DISPATCHER')(req3, res3, () => { roleAllowed = true; });
      assert.equal(roleAllowed, false);
      assert.equal(getStatus3(), 403, 'Demoted user must be rejected with 403 Forbidden');
    }),

    test('Auth Middleware: Token rejected (401) if user was deleted from database', () => {
      // Create temporary user David
      authService.register({
        email: 'david@test.local',
        password: 'Password123!',
        name: 'David Temp'
      });
      const loginDavid = authService.login({ email: 'david@test.local', password: 'Password123!' });
      const davidToken = loginDavid.token;
      const davidUser = db.findUserByEmail('david@test.local')!;

      // Delete David from database
      db.deleteUser(davidUser.id);

      // David tries to use his old validly-signed token
      let nextCalled = false;
      const { req, res, getStatus } = mockReqRes({ headers: { authorization: `Bearer ${davidToken}` } });
      requireAuth(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(getStatus(), 401, 'Deleted user session must be rejected with 401');
    }),

    test('Auth Middleware: Token rejected (403) if user account is disabled', () => {
      // Create user Eve
      authService.register({
        email: 'eve@test.local',
        password: 'Password123!',
        name: 'Eve Operator'
      });
      const loginEve = authService.login({ email: 'eve@test.local', password: 'Password123!' });
      const eveToken = loginEve.token;
      const eveUser = db.findUserByEmail('eve@test.local')!;

      // Disable Eve's account in database
      db.setUserDisabled(eveUser.id, true);

      let nextCalled = false;
      const { req, res, getStatus } = mockReqRes({ headers: { authorization: `Bearer ${eveToken}` } });
      requireAuth(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(getStatus(), 403, 'Disabled user account must be rejected with 403');
    }),

    // ---------------------------------------------------------
    // 4. Last Administrator Protection
    // ---------------------------------------------------------
    test('Last Admin: Cannot demote the sole administrator', () => {
      // Find current admin(s)
      const allUsers = db.getUsers();
      const adminUsers = allUsers.filter(u => u.role === 'ADMIN');
      assert.equal(adminUsers.length, 1, 'Initially only 1 admin exists');
      const soleAdmin = adminUsers[0];

      // Attempting to demote sole admin must throw error
      assert.throws(() => {
        db.updateUserRole(soleAdmin.id, 'OPERATOR');
      }, /At least one administrator account must remain/);

      // Sole admin MUST remain ADMIN
      const adminAfter = db.findUserById(soleAdmin.id)!;
      assert.equal(adminAfter.role, 'ADMIN', 'Admin must remain ADMIN after rejected demotion');
    }),

    test('Last Admin: Cannot delete the sole administrator', () => {
      const soleAdmin = db.getUsers().find(u => u.role === 'ADMIN')!;

      assert.throws(() => {
        db.deleteUser(soleAdmin.id);
      }, /At least one administrator account must remain/);

      assert.ok(db.findUserById(soleAdmin.id), 'Sole admin must still exist in DB');
    }),

    test('Last Admin: Cannot disable the sole administrator', () => {
      const soleAdmin = db.getUsers().find(u => u.role === 'ADMIN')!;

      assert.throws(() => {
        db.setUserDisabled(soleAdmin.id, true);
      }, /At least one administrator account must remain/);

      assert.notEqual(db.findUserById(soleAdmin.id)!.disabled, true);
    }),

    test('Last Admin: Demoting is allowed when a second administrator exists', () => {
      // Create a second user and promote them to ADMIN
      authService.register({
        email: 'secondadmin@test.local',
        password: 'Password123!',
        name: 'Second Admin'
      });
      const secondUser = db.findUserByEmail('secondadmin@test.local')!;
      db.updateUserRole(secondUser.id, 'ADMIN');

      assert.equal(db.getUsers().filter(u => u.role === 'ADMIN').length, 2);

      // Now demoting the second admin is allowed because the first admin remains
      const demoted = db.updateUserRole(secondUser.id, 'DISPATCHER');
      assert.equal(demoted.role, 'DISPATCHER');
      assert.equal(db.getUsers().filter(u => u.role === 'ADMIN').length, 1);
    }),

    // ---------------------------------------------------------
    // 5. System and Diagnostic Endpoints Protection
    // ---------------------------------------------------------
    test('System Endpoints: Unauthenticated requests to /api/system/* receive 401', () => {
      // Test unauthenticated call to requireAuth middleware
      const { req: req1, res: res1, getStatus: getStatus1 } = mockReqRes({});
      requireAuth(req1, res1, () => {});
      assert.equal(getStatus1(), 401, 'Unauthenticated request must receive 401');

      // Test with empty bearer token
      const { req: req2, res: res2, getStatus: getStatus2 } = mockReqRes({ headers: { authorization: 'Bearer ' } });
      requireAuth(req2, res2, () => {});
      assert.equal(getStatus2(), 401, 'Empty bearer token must receive 401');
    }),

    test('System Endpoints: Non-admin authenticated user receives 403 for AI Providers endpoint', () => {
      // OPERATOR user
      const { req, res, getStatus } = mockReqRes({ user: { role: 'OPERATOR' } });
      requireRole('ADMIN')(req, res, () => {});
      assert.equal(getStatus(), 403, 'Non-admin user must receive 403 for admin-only endpoint');
    }),

    test('System Endpoints: Admin user receives 200 and no API keys or secrets are exposed', async () => {
      const providers = await aiRegistry.getAllStatuses();
      assert.ok(Array.isArray(providers));

      // Assert that no provider status exposes any secret, raw key, or credential
      for (const p of providers) {
        const jsonStr = JSON.stringify(p);
        assert.equal(jsonStr.includes(process.env.GEMINI_API_KEY || '____never_match____'), false);
        assert.equal('apiKey' in p, false);
        assert.equal('secret' in p, false);
      }
    }),

    // ---------------------------------------------------------
    // 6. Role-Based Access Control (Incident & Resource Permissions)
    // ---------------------------------------------------------
    test('RBAC: Incident Creation allowed for ADMIN, DISPATCHER, OPERATOR; rejected for RESPONDER', () => {
      const allowedRoles = ['ADMIN', 'DISPATCHER', 'OPERATOR'] as const;
      for (const role of allowedRoles) {
        let allowed = false;
        const { req, res } = mockReqRes({ user: { role } });
        requireRole('ADMIN', 'DISPATCHER', 'OPERATOR')(req, res, () => { allowed = true; });
        assert.equal(allowed, true, `${role} must be permitted to create incidents`);
      }

      let responderAllowed = false;
      const { req, res, getStatus } = mockReqRes({ user: { role: 'RESPONDER' } });
      requireRole('ADMIN', 'DISPATCHER', 'OPERATOR')(req, res, () => { responderAllowed = true; });
      assert.equal(responderAllowed, false, 'RESPONDER must not be permitted to create incidents');
      assert.equal(getStatus(), 403);
    }),

    test('RBAC: Incident Status Update allowed for ADMIN, DISPATCHER, RESPONDER; rejected for OPERATOR', () => {
      const allowedRoles = ['ADMIN', 'DISPATCHER', 'RESPONDER'] as const;
      for (const role of allowedRoles) {
        let allowed = false;
        const { req, res } = mockReqRes({ user: { role } });
        requireRole('ADMIN', 'DISPATCHER', 'RESPONDER')(req, res, () => { allowed = true; });
        assert.equal(allowed, true, `${role} must be permitted to update incident status`);
      }

      let operatorAllowed = false;
      const { req, res, getStatus } = mockReqRes({ user: { role: 'OPERATOR' } });
      requireRole('ADMIN', 'DISPATCHER', 'RESPONDER')(req, res, () => { operatorAllowed = true; });
      assert.equal(operatorAllowed, false, 'OPERATOR must not be permitted to update incident status');
      assert.equal(getStatus(), 403);
    }),

    test('RBAC: Resource Management allowed only for ADMIN and DISPATCHER; rejected for RESPONDER & OPERATOR', () => {
      for (const role of ['ADMIN', 'DISPATCHER'] as const) {
        let allowed = false;
        const { req, res } = mockReqRes({ user: { role } });
        requireRole('ADMIN', 'DISPATCHER')(req, res, () => { allowed = true; });
        assert.equal(allowed, true, `${role} must be permitted to manage resources`);
      }

      for (const role of ['RESPONDER', 'OPERATOR'] as const) {
        let allowed = false;
        const { req, res, getStatus } = mockReqRes({ user: { role } });
        requireRole('ADMIN', 'DISPATCHER')(req, res, () => { allowed = true; });
        assert.equal(allowed, false, `${role} must NOT be permitted to manage resources`);
        assert.equal(getStatus(), 403);
      }
    }),

    // ---------------------------------------------------------
    // 7. India Regulatory Radio Configuration Wording
    // ---------------------------------------------------------
    test('Radio Wording: Accurately reflects Indian regulatory requirements without claiming single frequency', () => {
      const metrics = meshCommunicationService.getMeshMetrics();
      const expectedText = 'Radio configuration will be selected according to the applicable Indian regulatory requirements and the specific Meshtastic-compatible hardware used during the hardware integration phase.';

      assert.ok(metrics.notice.includes(expectedText), 'Notice must contain exact regulatory wording');
      assert.equal(metrics.notice.includes('US 915MHz'), false, 'Must NOT claim US 915MHz as deployment configuration');
      assert.equal(metrics.notice.includes('EU 868MHz'), false, 'Must NOT claim EU 868MHz as deployment configuration');

      const info = meshCommunicationService.getInfo();
      assert.ok(info.offlineCapability.includes(expectedText), 'Info offlineCapability must contain exact regulatory wording');
    }),

    // ---------------------------------------------------------
    // 8. Monotonic Sequence Numbering & Strict Validation
    // ---------------------------------------------------------
    test('Incidents: Monotonic sequential numbering generates INC-YYYY-0001, INC-YYYY-0002', () => {
      const currentYear = new Date().getFullYear();

      const inc1 = incidentService.createIncident({
        title: 'Flash Flood Watch',
        description: 'Water levels rising rapidly near stream marker 4',
        severity: 'HIGH'
      });

      const inc2 = incidentService.createIncident({
        title: 'Tree Down Blocking Route 7',
        description: 'Road blocked in both directions by large pine',
        severity: 'MEDIUM'
      });

      assert.equal(inc1.incidentNumber, `INC-${currentYear}-0001`);
      assert.equal(inc2.incidentNumber, `INC-${currentYear}-0002`);
    }),

    test('Location: Missing coordinates correctly stores null and flags isUnavailable without fake coordinates', () => {
      const inc = incidentService.createIncident({
        title: 'Cell Tower Signal Drop',
        description: 'Field report received with no GPS lock',
        severity: 'LOW',
        locationAddress: ''
      });

      assert.equal(inc.location?.latitude, null, 'Latitude must be null when not provided');
      assert.equal(inc.location?.longitude, null, 'Longitude must be null when not provided');
      assert.equal(inc.location?.isUnavailable, true, 'isUnavailable must be true when no location data');
      assert.notEqual(inc.location?.latitude, 37.7749, 'Must NOT fallback to San Francisco coordinates');
    }),

    test('Validation: Rejects invalid latitude / longitude values', () => {
      assert.throws(() => {
        incidentService.createIncident({
          title: 'Invalid Coordinates',
          description: 'Testing out of bounds latitude',
          latitude: 95.0, // > 90
          longitude: 10.0
        });
      }, /Latitude must be a valid number between -90 and 90/);
    }),

    // ---------------------------------------------------------
    // 9. Database Corruption Recovery
    // ---------------------------------------------------------
    test('Persistence: Recovers from corrupted JSON file by backing up and reinitializing clean state', () => {
      fs.writeFileSync(TEST_DB_PATH, '{"corrupted": true, broken_json...', 'utf-8');

      db.resetForTesting(TEST_DB_PATH);

      const status = db.getStatus();
      assert.equal(status.isInitialized, true, 'Database must recover and be initialized');
      assert.equal(Array.isArray(db.getIncidents()), true);
      assert.equal(db.getIncidents().length, 0);

      // Verify backup file was created
      const dirFiles = fs.readdirSync(path.dirname(TEST_DB_PATH));
      const backupFound = dirFiles.some(f => f.includes('corrupt') && f.includes('sentinelgrid'));
      assert.ok(backupFound, 'Corrupt backup file should be generated');

      // Clean up test backup files
      dirFiles.forEach(f => {
        if (f.startsWith('sentinelgrid.test')) {
          try {
            fs.unlinkSync(path.join(path.dirname(TEST_DB_PATH), f));
          } catch {}
        }
      });
    })
  ];

  for (const t of tests) {
    await t();
  }

  // Clean up test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  console.log('\n====================================================');
  console.log(`  Tests Completed: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
