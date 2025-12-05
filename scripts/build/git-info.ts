#!/usr/bin/env bun
/**
 * Git Information Helper
 * Extracts git metadata for build constants
 * [#REF:GIT-INFO]
 *
 * Usage:
 *   bun run scripts/build/git-info.ts           # JSON output
 *   bun run scripts/build/git-info.ts --shell   # Shell export format
 *   bun run scripts/build/git-info.ts --env     # .env format
 *
 * Example output (JSON):
 * {
 *   "commit": "abc1234",
 *   "commitFull": "abc1234567890...",
 *   "branch": "main",
 *   "tag": "v1.2.3",
 *   "isDirty": false,
 *   "message": "feat: add new feature",
 *   "author": "John Doe",
 *   "date": "2025-01-15T10:30:00Z"
 * }
 */

import { $ } from 'bun';

interface GitInfo {
  commit: string;
  commitFull: string;
  branch: string;
  tag: string | null;
  version: string;
  isDirty: boolean;
  message: string;
  author: string;
  email: string;
  date: string;
  remoteUrl: string | null;
}

/**
 * Execute git command and return trimmed output
 */
async function git(args: string): Promise<string> {
  try {
    const result = await $`git ${args.split(' ')}`.text();
    return result.trim();
  } catch {
    return '';
  }
}

/**
 * Get comprehensive git information
 */
async function getGitInfo(): Promise<GitInfo> {
  const [
    commitFull,
    commit,
    branch,
    tagRaw,
    isDirtyRaw,
    message,
    author,
    email,
    date,
    remoteUrl,
  ] = await Promise.all([
    git('rev-parse HEAD'),
    git('rev-parse --short HEAD'),
    git('rev-parse --abbrev-ref HEAD'),
    git('describe --tags --always').catch(() => ''),
    git('status --porcelain'),
    git('log -1 --format=%s'),
    git('log -1 --format=%an'),
    git('log -1 --format=%ae'),
    git('log -1 --format=%aI'),
    git('remote get-url origin').catch(() => ''),
  ]);

  // Parse tag to get clean version
  const tagMatch = tagRaw.match(/^v?(\d+\.\d+\.\d+)/);
  const tag = tagMatch ? tagRaw : null;

  // Determine version: prefer tag, fallback to describe output
  let version = tag || tagRaw;
  if (!version) {
    // Fallback to package.json version
    try {
      const pkg = await Bun.file('./package.json').json();
      version = pkg.version || '0.0.0';
    } catch {
      version = '0.0.0';
    }
  }

  return {
    commit: commit || 'unknown',
    commitFull: commitFull || 'unknown',
    branch: branch || 'unknown',
    tag,
    version,
    isDirty: isDirtyRaw.length > 0,
    message: message || '',
    author: author || 'unknown',
    email: email || '',
    date: date || new Date().toISOString(),
    remoteUrl: remoteUrl || null,
  };
}

/**
 * Format as shell export statements
 */
function toShellExports(info: GitInfo): string {
  return [
    `export GIT_COMMIT="${info.commit}"`,
    `export GIT_COMMIT_FULL="${info.commitFull}"`,
    `export GIT_BRANCH="${info.branch}"`,
    `export GIT_TAG="${info.tag || ''}"`,
    `export GIT_VERSION="${info.version}"`,
    `export GIT_DIRTY="${info.isDirty}"`,
    `export GIT_MESSAGE="${info.message.replace(/"/g, '\\"')}"`,
    `export GIT_AUTHOR="${info.author}"`,
    `export GIT_DATE="${info.date}"`,
  ].join('\n');
}

/**
 * Format as .env file content
 */
function toEnvFormat(info: GitInfo): string {
  return [
    `GIT_COMMIT=${info.commit}`,
    `GIT_COMMIT_FULL=${info.commitFull}`,
    `GIT_BRANCH=${info.branch}`,
    `GIT_TAG=${info.tag || ''}`,
    `GIT_VERSION=${info.version}`,
    `GIT_DIRTY=${info.isDirty}`,
    `GIT_AUTHOR=${info.author}`,
    `GIT_DATE=${info.date}`,
  ].join('\n');
}

/**
 * Format as Bun --define flags
 */
function toDefineFlags(info: GitInfo): string {
  return [
    `--define GIT_COMMIT='"${info.commit}"'`,
    `--define GIT_BRANCH='"${info.branch}"'`,
    `--define BUILD_VERSION='"${info.version}"'`,
    `--define BUILD_TIME='"${new Date().toISOString()}"'`,
  ].join(' ');
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = Bun.argv.slice(2);
  const info = await getGitInfo();

  if (args.includes('--shell')) {
    console.log(toShellExports(info));
  } else if (args.includes('--env')) {
    console.log(toEnvFormat(info));
  } else if (args.includes('--define') || args.includes('--flags')) {
    console.log(toDefineFlags(info));
  } else if (args.includes('--version')) {
    console.log(info.version);
  } else if (args.includes('--commit')) {
    console.log(info.commit);
  } else if (args.includes('--branch')) {
    console.log(info.branch);
  } else {
    // Default: JSON output
    console.log(JSON.stringify(info, null, 2));
  }
}

// Export for programmatic use
export { getGitInfo, toShellExports, toEnvFormat, toDefineFlags };
export type { GitInfo };

// Run if executed directly
if (import.meta.main) {
  main();
}
