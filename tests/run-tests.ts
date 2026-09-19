import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../server/db/database.ts';
import { authService } from '../server/services/authService.ts';
import { incidentService } from '../server/services/incidentService.ts';
import { resourceService } from '../server/services/resourceService.ts';
import { meshCommunicationService } from '../server/services/meshCommunicationService.ts';
import { aiRegistry } from '../server/ai/index.ts';

// Use a dedicated test database file so we don't clobber live user data
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'sentinelgrid.test.json');

async function runAllTests() {
  console.log('====================================================');
  console.log('  SentinelGrid Phase 1 Automated Test Suite');
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
        failed++;
      }
    };
  }

  // Setup test environment
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  db.resetForTesting(TEST_DB_PATH);

  const tests = [
    // 1. Auth & Admin Registration Restriction
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

    test('Auth: Token revocation prevents session reuse after logout', () => {
      const loginRes = authService.login({
        email: 'commander@test.local',
        password: 'Password123!'
      });

      const token = loginRes.token;
      assert.equal(authService.isTokenRevoked(token), false, 'Token should initially be valid');

      // Invalidate token
      authService.revokeToken(token);
      assert.equal(authService.isTokenRevoked(token), true, 'Token must be marked revoked');
    }),

    test('Auth: Admin can promote another user role in database', () => {
      const users = db.getUsers();
      const opUser = users.find(u => u.email === 'operator2@test.local');
      assert.ok(opUser, 'Operator user exists');

      const updated = db.updateUserRole(opUser.id, 'DISPATCHER');
      assert.ok(updated);
      assert.equal(updated.role, 'DISPATCHER');
    }),

    // 2. Incident Sequential Numbering
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

    // 3. Location Handling & Zero Fake Coordinates
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

    test('Location: Valid coordinates are preserved accurately', () => {
      const inc = incidentService.createIncident({
        title: 'Structure Fire Sector 3',
        description: 'Smoke observed from timber depot',
        severity: 'CRITICAL',
        latitude: 45.5152,
        longitude: -122.6784,
        locationAddress: '100 Main St'
      });

      assert.equal(inc.location?.latitude, 45.5152);
      assert.equal(inc.location?.longitude, -122.6784);
      assert.equal(inc.location?.isUnavailable, false);
      assert.equal(inc.location?.address, '100 Main St');
    }),

    // 4. Strict Input Validation
    test('Validation: Rejects incident with empty or short title', () => {
      assert.throws(() => {
        incidentService.createIncident({
          title: '  ',
          description: 'Valid long description for test',
          severity: 'MEDIUM'
        });
      }, /Incident title is required/);
    }),

    test('Validation: Rejects incident with short description', () => {
      assert.throws(() => {
        incidentService.createIncident({
          title: 'Valid Title Here',
          description: 'tiny',
          severity: 'MEDIUM'
        });
      }, /Incident description is required/);
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

      assert.throws(() => {
        incidentService.createIncident({
          title: 'Invalid Coordinates',
          description: 'Testing out of bounds longitude',
          latitude: 10.0,
          longitude: 200.0 // > 180
        });
      }, /Longitude must be a valid number between -180 and 180/);
    }),

    test('Validation: Rejects invalid incident status on update', () => {
      const incidents = db.getIncidents();
      const first = incidents[0];
      assert.throws(() => {
        incidentService.updateIncidentStatus(first.id, 'NON_EXISTENT_STATUS' as any);
      }, /Invalid incident status/);
    }),

    // 5. Resource Management
    test('Resources: Creates resource and enforces type validation', () => {
      const res = resourceService.createResource({
        name: 'Mobile Aid Trailer 01',
        type: 'AMBULANCE',
        location: 'Base Camp Echo',
        capacity: '4 Stretchers'
      });

      assert.ok(res.id);
      assert.equal(res.availability, 'AVAILABLE');

      assert.throws(() => {
        resourceService.createResource({
          name: 'Invalid Type Asset',
          type: 'INVALID_TYPE' as any,
          location: 'HQ'
        });
      }, /Invalid resource type/);
    }),

    // 6. Mesh Placeholder Telemetry
    test('Mesh: Accurately reports simulation not started with proper regulatory disclosure', () => {
      const metrics = meshCommunicationService.getMeshMetrics();
      assert.equal(metrics.meshStatus, 'Phase 2 — Simulation not started');
      assert.equal(metrics.hardwareConnected, false);
      assert.ok(metrics.notice.includes('Phase 2'));
    }),

    // 7. Database Corruption Recovery
    test('Persistence: Recovers from corrupted JSON file by backing up and reinitializing clean state', () => {
      // Intentionally write broken JSON to test database file
      fs.writeFileSync(TEST_DB_PATH, '{"corrupted": true, broken_json...', 'utf-8');

      // Re-initializing database should not crash; it should back up the corrupt file and initialize fresh schema
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
