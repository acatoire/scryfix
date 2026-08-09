// Read-only GitHub data for the stats dashboard (doc/project-plan-deliverables-phase-2.md item 2).
// Unauthenticated api.github.com calls — all data here is public, so the dashboard works for any
// visitor without asking them to paste a PAT (unlike src/lib/github.ts's write path).

import { Octokit } from '@octokit/rest'
import type { GitHubTarget } from './github'

const octokit = new Octokit()

export interface OpenPullRequest {
  number: number
  title: string
  htmlUrl: string
  headOwner: string
  headBranch: string
  author: string | null
  createdAt: string
}

export async function listOpenPullRequests(upstream: GitHubTarget): Promise<OpenPullRequest[]> {
  const { data } = await octokit.pulls.list({
    owner: upstream.owner,
    repo: upstream.repo,
    state: 'open',
    per_page: 100,
  })
  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    htmlUrl: pr.html_url,
    headOwner: pr.head.repo?.owner.login ?? pr.head.label.split(':')[0],
    headBranch: pr.head.ref,
    author: pr.user?.login ?? null,
    createdAt: pr.created_at,
  }))
}

// The report.json path isn't guaranteed by PR number alone — read it off the PR's own changed
// files rather than guessing a path from the title/branch name.
export async function findReportJsonPath(upstream: GitHubTarget, prNumber: number): Promise<string | null> {
  const { data } = await octokit.pulls.listFiles({
    owner: upstream.owner,
    repo: upstream.repo,
    pull_number: prNumber,
    per_page: 100,
  })
  const reportFile = data.find((file) => file.filename.startsWith('reports/') && file.filename.endsWith('.json'))
  return reportFile?.filename ?? null
}

export function rawFileUrl(owner: string, repo: string, ref: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`
}

export async function getRawJson<T>(owner: string, repo: string, ref: string, path: string): Promise<T> {
  const response = await fetch(rawFileUrl(owner, repo, ref, path))
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`)
  return response.json() as Promise<T>
}

export interface StatsSnapshot {
  date: string
  open_prs: number
  image_count: number
  repo_size_bytes: number
}

// Written by .github/workflows/stats-snapshot.yml — a static site can't compute "history" live, so
// this is the one piece of dashboard data that isn't fetched fresh from the API on every visit.
export async function getStatsHistory(upstream: GitHubTarget): Promise<StatsSnapshot[]> {
  try {
    return await getRawJson<StatsSnapshot[]>(upstream.owner, upstream.repo, 'main', 'stats/history.json')
  } catch {
    return []
  }
}
