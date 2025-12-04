#!/usr/bin/env bun
/**
 * Build script with automatic build-time constants injection
 * @see https://bun.com/docs/guides/runtime/build-time-constants
 * [#REF:BUILD-SCRIPT]
 *
 * Usage:
 *   bun run scripts/build/compile.ts [entrypoint] [--env=production]
 *
 * Examples:
 *   bun run scripts/build/compile.ts
 *   bun run scripts/build/compile.ts src/cli.ts --env=staging
 *   bun run scripts/build/compile.ts --compile --env=production
 */

import { $ } from 'bun';
import { createBuildDefines } from '@/lib/constants';

// =============================================================================
// CONFIG
// =============================================================================

const ENV = (Bun.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'development') as
  | 'development'
  | 'staging'
  | 'production';

const VARIANT = Bun.argv.find(arg => arg.startsWith('--variant='))?.split('=')[1] || '';

const COMPILE = Bun.argv.includes('--compile');
const ENTRYPOINT =
  Bun.argv.find(arg => arg.endsWith('.ts') && !arg.includes('compile.ts')) ||
  './scripts/start-server.ts';

const API_URLS = {
  development: 'http://localhost:8000',
  staging: 'https://trader-analyzer-markets-staging.utahj4754.workers.dev',
  production: 'https://trader-analyzer-markets.utahj4754.workers.dev',
} as const;

// =============================================================================
// GATHER BUILD METADATA
// =============================================================================

async function getBuildMetadata() {
  const pkg = await Bun.file('./package.json').json();

  // Git info (with fallbacks)
  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  let gitTag = pkg.version;

  try {
    gitCommit = (await $`git rev-parse --short HEAD`.text()).trim();
    gitBranch = (await $`git rev-parse --abbrev-ref HEAD`.text()).trim();
    const tagResult = await $`git describe --tags --always`.nothrow().text();
    if (tagResult) gitTag = tagResult.trim();
  } catch {
    console.warn('Git not available, using fallback values');
  }

  return {
    version: gitTag,
    buildTime: new Date().toISOString(),
    gitCommit,
    gitBranch,
    pkgVersion: pkg.version,
    pkgName: pkg.name,
  };
}

// =============================================================================
// BUILD
// =============================================================================

async function build() {
  console.log(`\n🔨 Building for ${ENV}...\n`);

  const meta = await getBuildMetadata();

  // Create defines
  const defines = createBuildDefines({
    BUILD_VERSION: meta.version,
    BUILD_VARIANT: VARIANT,
    BUILD_TIME: meta.buildTime,
    GIT_COMMIT: meta.gitCommit,
    GIT_BRANCH: meta.gitBranch,
    NODE_ENV: ENV,
    DEBUG: ENV === 'development' || VARIANT === 'debug',
    ENABLE_ANALYTICS: ENV === 'production',
    ENABLE_EXPERIMENTAL: ENV !== 'production',
    API_URL: API_URLS[ENV],
    WORKERS_API_URL: API_URLS[ENV],
    PLATFORM: process.platform,
    BUILD_CONFIG: {
      version: meta.version,
      variant: VARIANT,
      buildTime: meta.buildTime,
      gitCommit: meta.gitCommit,
      gitBranch: meta.gitBranch,
      env: ENV,
      debug: ENV === 'development' || VARIANT === 'debug',
      api: {
        baseUrl: API_URLS[ENV],
        workersUrl: API_URLS[ENV],
        timeout: ENV === 'production' ? 30000 : 60000,
      },
    },
  });

  console.log('📦 Build metadata:');
  console.log(`   Version:    ${meta.version}`);
  console.log(`   Build time: ${meta.buildTime}`);
  console.log(`   Git commit: ${meta.gitCommit}`);
  console.log(`   Git branch: ${meta.gitBranch}`);
  console.log(`   Environment: ${ENV}`);
  console.log(`   Variant:     ${VARIANT}`);
  console.log(`   API URL:    ${API_URLS[ENV]}`);
  console.log('');

  const targetDir = VARIANT ? `build/${VARIANT}` : `dist/${ENV}`;
  const outdir = `./${targetDir}`;
  const jsOutfile = `./${targetDir}/start-server.js`;
  const execName = VARIANT === 'debug' ? 'bun-debug' : `${meta.pkgName}-${VARIANT || ENV}`;
  const execOutfile = `./${targetDir}/${execName}${process.platform === 'win32' ? '.exe' : ''}`;

  const result = await Bun.build({
    entrypoints: [ENTRYPOINT],
    outdir,
    target: 'bun',
    minify: ENV === 'production',
    sourcemap: ENV !== 'production' ? 'inline' : 'none',
    define: defines,
  });

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log('✅ Build successful!');
  console.log(`   Output: ${outdir}`);
  console.log(`   Files: ${result.outputs.length}`);

  for (const output of result.outputs) {
    const size = (output.size / 1024).toFixed(2);
    console.log(`   - ${output.path} (${size} KB)`);
  }

  // If compiling to executable
  if (COMPILE) {
    console.log('\n🔗 Compiling to executable...');
    await $`bun build --compile ${jsOutfile} --outfile ${execOutfile}`;
    console.log(`✅ Executable: ${execOutfile}`);
  }

  return result;
}

// =============================================================================
// RUN
// =============================================================================

build().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
