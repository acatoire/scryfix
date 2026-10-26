// Duplicate/related-report detection (doc/project-plan.md §4.3): shows the full current state of
// "known issues" on a card — merged reports (repo contents) and open PRs — before a new one is filed.
// Unauthenticated api.github.com reads, same as githubRead.ts.

import { Octokit } from '@octokit/rest'
import type { GitHubTarget } from './github'
import { rawFileUrl } from './githubRead'

const octokit = new Octokit()

export interface RelatedReport {
  status: 'merged' | 'open'
  title: string
  url: string
  errorType: string | null
  prNumber: number | null
}

interface ContentEntry {
  name: string
  type: string
  html_url: string
}

async function listDirectory(upstream: GitHubTarget, path: string): Promise<ContentEntry[]> {
  try {
    const { data } = await octokit.repos.getContent({ owner: upstream.owner, repo: upstream.repo, path })
    return Array.isArray(data) ? (data as ContentEntry[]) : []
  } catch (err) {
    if ((err as { status?: number }).status === 404) return []
    throw err
  }
}

async function errorTypeOf(upstream: GitHubTarget, path: string): Promise<string | null> {
  try {
    const response = await fetch(rawFileUrl(upstream.owner, upstream.repo, 'main', path))
    if (!response.ok) return null
    const json = (await response.json()) as { error_type?: string }
    return json.error_type ?? null
  } catch {
    return null
  }
}

export async function findMergedReports(
  upstream: GitHubTarget,
  set: string,
  collectorNumber: string,
): Promise<RelatedReport[]> {
  const folder = `reports/${set}/${collectorNumber}`
  const entries = await listDirectory(upstream, folder)
  const reports = entries.filter((entry) => entry.type === 'file' && entry.name.endsWith('.json'))
  return Promise.all(
    reports.map(async (entry) => ({
      status: 'merged' as const,
      title: entry.name,
      url: entry.html_url,
      errorType: await errorTypeOf(upstream, `${folder}/${entry.name}`),
      prNumber: null,
    })),
  )
}

// Merged reports of the `unlisted_printing` wizard live under reports/_unlisted/{set}/{key}/ — list
// every key folder of the set so a new unlisted report can be cross-checked against them (§5.3).
export async function findMergedUnlistedReports(upstream: GitHubTarget, set: string): Promise<RelatedReport[]> {
  const folders = (await listDirectory(upstream, `reports/_unlisted/${set}`)).filter((e) => e.type === 'dir')
  return folders.map((folder) => ({
    status: 'merged' as const,
    title: `_unlisted/${set}/${folder.name}`,
    url: folder.html_url,
    errorType: 'unlisted_printing',
    prNumber: null,
  }))
}

// The search only narrows candidates by text; the PR's own changed files are the source of truth
// for "does this PR touch this card's report folder".
export async function findOpenReports(
  upstream: GitHubTarget,
  set: string,
  collectorNumber: string,
  folderPrefix: string = `reports/${set}/${collectorNumber}/`,
): Promise<RelatedReport[]> {
  const { data } = await octokit.search.issuesAndPullRequests({
    q: `repo:${upstream.owner}/${upstream.repo} type:pr state:open ${set} ${collectorNumber}`,
    per_page: 10,
  })
  const matches = await Promise.all(
    data.items.map(async (item): Promise<RelatedReport | null> => {
      const { data: files } = await octokit.pulls.listFiles({
        owner: upstream.owner,
        repo: upstream.repo,
        pull_number: item.number,
        per_page: 100,
      })
      if (!files.some((file) => file.filename.startsWith(folderPrefix))) return null
      return {
        status: 'open',
        title: item.title,
        url: item.html_url,
        errorType: /^\[([^\]]+)\]/.exec(item.title)?.[1] ?? null,
        prNumber: item.number,
      }
    }),
  )
  return matches.filter((match): match is RelatedReport => match !== null)
}

export async function findRelatedReports(
  upstream: GitHubTarget,
  set: string,
  collectorNumber: string,
): Promise<RelatedReport[]> {
  const [merged, open] = await Promise.all([
    findMergedReports(upstream, set, collectorNumber),
    findOpenReports(upstream, set, collectorNumber),
  ])
  return [...open, ...merged]
}

export async function findRelatedUnlistedReports(upstream: GitHubTarget, set: string): Promise<RelatedReport[]> {
  const [merged, open] = await Promise.all([
    findMergedUnlistedReports(upstream, set),
    findOpenReports(upstream, set, '_unlisted', `reports/_unlisted/${set}/`),
  ])
  return [...open, ...merged]
}
