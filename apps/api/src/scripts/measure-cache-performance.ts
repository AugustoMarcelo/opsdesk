/**
 * Performance Measurement Script for Cache
 *
 * This script measures the latency improvement when using Redis cache
 * for both ticket listings and user permissions.
 *
 * Usage:
 *   npx ts-node src/scripts/measure-cache-performance.ts
 */

import 'dotenv/config';
import { db } from '../db/client';
import { redis } from '../cache/redis.client';
import { AuthorizationService } from '../auth/authorization.service';
import { TicketsRepository } from '../tickets/tickets.repository';
import { CacheKeys } from '../cache/cache-keys';

interface MeasurementResult {
  test: string;
  withoutCache: number;
  withCache: number;
  improvement: string;
  speedup: string;
}

async function measureTime(fn: () => Promise<any>): Promise<number> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

async function measureTicketsListingPerformance(): Promise<MeasurementResult> {
  console.log('\n📊 Testing Tickets Listing Performance...');

  const ticketsRepo = new TicketsRepository();
  const query = { offset: 0, limit: 10, order: 'desc' as const };
  const cacheKey = CacheKeys.ticketsList(query);

  // Clear cache first
  await redis.del(cacheKey);

  // Measure WITHOUT cache (cold)
  const coldTime = await measureTime(async () => {
    await ticketsRepo.list(db, query);
  });
  console.log(`  Without cache (cold): ${coldTime.toFixed(2)}ms`);

  // Populate cache
  const tickets = await ticketsRepo.list(db, query);
  await redis.set(cacheKey, JSON.stringify(tickets), 'EX', 30);

  // Measure WITH cache (warm)
  const warmTime = await measureTime(async () => {
    await redis.get(cacheKey);
  });
  console.log(`  With cache (warm): ${warmTime.toFixed(2)}ms`);

  const improvement = (((coldTime - warmTime) / coldTime) * 100).toFixed(2);
  const speedup = (coldTime / warmTime).toFixed(2);

  // Clean up
  await redis.del(cacheKey);

  return {
    test: 'Tickets Listing (offset:0, limit:10)',
    withoutCache: parseFloat(coldTime.toFixed(2)),
    withCache: parseFloat(warmTime.toFixed(2)),
    improvement: `${improvement}%`,
    speedup: `${speedup}x`,
  };
}

async function measureUserPermissionsPerformance(
  userId: string,
): Promise<MeasurementResult> {
  console.log('\n📊 Testing User Permissions Performance...');

  const authService = new AuthorizationService();
  const cacheKey = CacheKeys.userPermissions(userId);

  // Clear cache first
  await redis.del(cacheKey);

  // Measure WITHOUT cache (cold)
  const coldTime = await measureTime(async () => {
    await authService.getUserPermissions(userId);
  });
  console.log(`  Without cache (cold): ${coldTime.toFixed(2)}ms`);

  // The method already caches, so call it again to measure WITH cache
  const warmTime = await measureTime(async () => {
    await authService.getUserPermissions(userId);
  });
  console.log(`  With cache (warm): ${warmTime.toFixed(2)}ms`);

  const improvement = (((coldTime - warmTime) / coldTime) * 100).toFixed(2);
  const speedup = (coldTime / warmTime).toFixed(2);

  // Clean up
  await redis.del(cacheKey);

  return {
    test: 'User Permissions Lookup',
    withoutCache: parseFloat(coldTime.toFixed(2)),
    withCache: parseFloat(warmTime.toFixed(2)),
    improvement: `${improvement}%`,
    speedup: `${speedup}x`,
  };
}

async function runMultipleMeasurements(
  testFn: () => Promise<MeasurementResult>,
  iterations: number = 5,
): Promise<MeasurementResult> {
  const results: MeasurementResult[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = await testFn();
    results.push(result);
    // Small delay between iterations
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Calculate averages
  const avgWithoutCache =
    results.reduce((sum, r) => sum + r.withoutCache, 0) / iterations;
  const avgWithCache =
    results.reduce((sum, r) => sum + r.withCache, 0) / iterations;
  const avgImprovement = (
    ((avgWithoutCache - avgWithCache) / avgWithoutCache) *
    100
  ).toFixed(2);
  const avgSpeedup = (avgWithoutCache / avgWithCache).toFixed(2);

  return {
    test: results[0].test,
    withoutCache: parseFloat(avgWithoutCache.toFixed(2)),
    withCache: parseFloat(avgWithCache.toFixed(2)),
    improvement: `${avgImprovement}%`,
    speedup: `${avgSpeedup}x`,
  };
}

async function getUserIdForTest(): Promise<string | null> {
  try {
    const result = await db.query.users.findFirst();
    return result?.id || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

function printResults(results: MeasurementResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 CACHE PERFORMANCE MEASUREMENT RESULTS');
  console.log('='.repeat(80));

  console.log('\n' + '-'.repeat(80));
  console.log(
    'Test'.padEnd(40) +
      'Without Cache'.padEnd(15) +
      'With Cache'.padEnd(15) +
      'Improvement'.padEnd(12) +
      'Speedup',
  );
  console.log('-'.repeat(80));

  results.forEach((result) => {
    console.log(
      result.test.padEnd(40) +
        `${result.withoutCache}ms`.padEnd(15) +
        `${result.withCache}ms`.padEnd(15) +
        result.improvement.padEnd(12) +
        result.speedup,
    );
  });

  console.log('-'.repeat(80));

  console.log('\n💡 Key Takeaways:');
  console.log('  - Cache reduces latency by avoiding database queries');
  console.log('  - Speedup shows how many times faster cached queries are');
  console.log('  - Higher speedup = more effective caching');
  console.log(
    '  - User permissions caching is especially effective for RBAC checks',
  );
  console.log('  - List caching helps with frequently accessed data\n');
}

async function main() {
  console.log('🚀 Starting Cache Performance Measurement...\n');
  console.log('This script will measure latency with and without Redis cache.');
  console.log('Each test will run 5 times and results will be averaged.\n');

  try {
    const results: MeasurementResult[] = [];

    // Test 1: Tickets Listing
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Tickets Listing (5 iterations)');
    console.log('='.repeat(80));
    const ticketsResult = await runMultipleMeasurements(
      measureTicketsListingPerformance,
      5,
    );
    results.push(ticketsResult);

    // Test 2: User Permissions
    const userId = await getUserIdForTest();
    if (userId) {
      console.log('\n' + '='.repeat(80));
      console.log('TEST 2: User Permissions (5 iterations)');
      console.log('='.repeat(80));
      const permissionsResult = await runMultipleMeasurements(
        () => measureUserPermissionsPerformance(userId),
        5,
      );
      results.push(permissionsResult);
    } else {
      console.log(
        '\n⚠️ No users found in database. Skipping user permissions test.',
      );
    }

    // Print final results
    printResults(results);

    console.log('✅ Performance measurement completed!\n');
  } catch (error) {
    console.error('❌ Error during performance measurement:', error);
  } finally {
    // Close connections
    await redis.quit();
    process.exit(0);
  }
}

void main();
