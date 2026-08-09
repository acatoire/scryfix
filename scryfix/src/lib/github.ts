// GitHub write client: fork/branch/commit/PR automation onto the reports repo (doc/project-plan.md
// §4.5). Pure api.github.com REST calls (Contents API, git/refs, pulls) — no CORS relay needed here,
// unlike the OAuth token exchange in §4.1, so this works unchanged against the PAT auth stand-in
// (githubAuth.ts) today and against Device Flow later.

import { Octokit } from '@octokit/rest'
import type { Report } from '../report/types'
import type { GitHubAuth } from './githubAuth'

export interface GitHubTarget {
  owner: string
  repo: string
}

// Reports live in a /reports folder inside the app's own repo, not a separate data repo — see
// ai/decisions.md.
export const UPSTREAM_REPO: GitHubTarget = { owner: 'acatoire', repo: 'scryfix' }

export class GitHubClientError extends Error {}

function octokitFor(auth: GitHubAuth): Octokit {
  const token = auth.getToken()
  if (!token) throw new GitHubClientError('Not signed in to GitHub.')
  return new Octokit({ auth: token })
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function stringToBase64(text: string): string {
  return uint8ArrayToBase64(new TextEncoder().encode(text))
}

async function fileToBase64(file: File): Promise<string> {
  return uint8ArrayToBase64(new Uint8Array(await file.arrayBuffer()))
}

// A freshly-created fork's refs aren't immediately queryable — GitHub clones it in the background
// after `createFork` returns (202 Accepted, before the clone is done). An already-forked repo skips
// this entirely (200 OK, ready right away), so most calls never actually retry.
async function withRetry<T>(fn: () => Promise<T>, attempts = 5, delayMs = 1000): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === attempts) throw err
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error('unreachable')
}

async function ensureFork(octokit: Octokit, upstream: GitHubTarget): Promise<GitHubTarget> {
  const { data: fork } = await octokit.repos.createFork({ owner: upstream.owner, repo: upstream.repo })
  return { owner: fork.owner!.login, repo: fork.name }
}

async function getDefaultBranchSha(
  octokit: Octokit,
  target: GitHubTarget,
): Promise<{ branch: string; sha: string }> {
  const { data: repoData } = await octokit.repos.get({ owner: target.owner, repo: target.repo })
  const branch = repoData.default_branch
  const { data: ref } = await withRetry(() =>
    octokit.git.getRef({ owner: target.owner, repo: target.repo, ref: `heads/${branch}` }),
  )
  return { branch, sha: ref.object.sha }
}

async function createBranch(
  octokit: Octokit,
  fork: GitHubTarget,
  branch: string,
  fromSha: string,
): Promise<void> {
  await octokit.git.createRef({
    owner: fork.owner,
    repo: fork.repo,
    ref: `refs/heads/${branch}`,
    sha: fromSha,
  })
}

async function commitFile(
  octokit: Octokit,
  fork: GitHubTarget,
  branch: string,
  path: string,
  base64Content: string,
  message: string,
): Promise<void> {
  await octokit.repos.createOrUpdateFileContents({
    owner: fork.owner,
    repo: fork.repo,
    path,
    branch,
    message,
    content: base64Content,
  })
}

async function openPullRequest(
  octokit: Octokit,
  upstream: GitHubTarget,
  fork: GitHubTarget,
  base: string,
  head: string,
  title: string,
  body: string,
): Promise<{ url: string; number: number }> {
  const { data: pr } = await octokit.pulls.create({
    owner: upstream.owner,
    repo: upstream.repo,
    base,
    head: `${fork.owner}:${head}`,
    title,
    body,
  })
  return { url: pr.html_url, number: pr.number }
}

// Matches the /reports/{set}/{number}/... vs /reports/_unlisted/{set}/{key}/... split in §4.5.
function reportBasePath(report: Report): string {
  if (report.unlisted.is_unlisted) {
    const key = report.unlisted.collector_number_hash ?? 'unknown'
    return `reports/_unlisted/${report.unlisted.set_code}/${key}`
  }
  return `reports/${report.card.set}/${report.card.collector_number}`
}

// Duck-typed rather than `instanceof @octokit/request-error` — avoids importing that package just
// for a type check, and Octokit's own errors match this shape regardless of which call threw.
interface OctokitLikeError {
  status?: number
  message: string
  response?: { status?: number; url?: string; data?: unknown }
}

function isOctokitLikeError(err: unknown): err is OctokitLikeError {
  return typeof err === 'object' && err !== null && 'message' in err && 'status' in err
}

export interface GitHubErrorInfo {
  message: string
  detail: string
}

// Never include `err.request` here — Octokit's request object carries the Authorization header
// with the user's raw PAT, and this text is shown directly in the UI for the user to copy/paste.
export function describeGitHubError(err: unknown): GitHubErrorInfo {
  if (err instanceof GitHubClientError) {
    return { message: err.message, detail: err.message }
  }
  if (isOctokitLikeError(err)) {
    const status = err.status ?? err.response?.status
    const data = err.response?.data as { message?: string; documentation_url?: string } | undefined
    const message = data?.message
      ? `GitHub API error ${status ?? ''}: ${data.message}`.trim()
      : `GitHub API error ${status ?? ''}: ${err.message}`.trim()
    const detail = JSON.stringify(
      { status, url: err.response?.url, message: data?.message, documentation_url: data?.documentation_url },
      null,
      2,
    )
    return { message, detail }
  }
  if (err instanceof Error) {
    return { message: `Could not submit to GitHub: ${err.message}`, detail: err.stack ?? err.message }
  }
  return { message: 'Could not submit to GitHub.', detail: String(err) }
}

export interface SubmitReportInput {
  auth: GitHubAuth
  upstream: GitHubTarget
  report: Report
  files: { path: string; file: File }[]
}

export interface SubmitReportResult {
  prUrl: string
  prNumber: number
}

export async function submitReport({
  auth,
  upstream,
  report,
  files,
}: SubmitReportInput): Promise<SubmitReportResult> {
  const octokit = octokitFor(auth)

  const fork = await ensureFork(octokit, upstream)
  const { branch: baseBranch, sha } = await getDefaultBranchSha(octokit, fork)
  const branch = report.report_id
  await createBranch(octokit, fork, branch, sha)

  const basePath = reportBasePath(report)
  const message = `Add report ${report.report_id} for ${report.card.name}`
  await commitFile(
    octokit,
    fork,
    branch,
    `${basePath}/${report.report_id}.json`,
    stringToBase64(JSON.stringify(report, null, 2)),
    message,
  )
  for (const { path, file } of files) {
    await commitFile(octokit, fork, branch, `${basePath}/${path}`, await fileToBase64(file), message)
  }

  const pr = await openPullRequest(
    octokit,
    upstream,
    fork,
    baseBranch,
    branch,
    `[${report.error_type}] ${report.card.name} (${report.card.set.toUpperCase()} #${report.card.collector_number})`,
    report.description || '_No description provided._',
  )
  return { prUrl: pr.url, prNumber: pr.number }
}
