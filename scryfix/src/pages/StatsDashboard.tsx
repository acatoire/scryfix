import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TimeSeriesChart from '../components/TimeSeriesChart'
import { UPSTREAM_REPO } from '../lib/github'
import {
  findReportJsonPath,
  getRawJson,
  getStatsHistory,
  listOpenPullRequests,
  type OpenPullRequest,
  type StatsSnapshot,
} from '../lib/githubRead'
import type { Report } from '../report/types'
import './StatsDashboard.css'

interface PullRequestRow {
  pr: OpenPullRequest
  reportPath: string | null
  report: Report | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

async function loadRow(pr: OpenPullRequest): Promise<PullRequestRow> {
  try {
    const reportPath = await findReportJsonPath(UPSTREAM_REPO, pr.number)
    if (!reportPath) return { pr, reportPath: null, report: null }
    const report = await getRawJson<Report>(pr.headOwner, UPSTREAM_REPO.repo, pr.headBranch, reportPath)
    return { pr, reportPath, report }
  } catch {
    return { pr, reportPath: null, report: null }
  }
}

function StatsDashboard() {
  const [rows, setRows] = useState<PullRequestRow[] | null>(null)
  const [history, setHistory] = useState<StatsSnapshot[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listOpenPullRequests(UPSTREAM_REPO)
      .then((prs) => Promise.all(prs.map(loadRow)))
      .then((loaded) => {
        if (!cancelled) setRows(loaded)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load open pull requests from GitHub.')
      })

    getStatsHistory(UPSTREAM_REPO).then((data) => {
      if (!cancelled) setHistory(data)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="center" className="stats-dashboard">
      <h1>Stats dashboard</h1>
      <p>
        Read-only view of <code>{UPSTREAM_REPO.owner}/{UPSTREAM_REPO.repo}</code> — open reports awaiting
        review, and growth over time.
      </p>

      {error && <p className="wizard-error">{error}</p>}

      <h2>Open pull requests</h2>
      {rows === null ? (
        <p>Loading open pull requests…</p>
      ) : rows.length === 0 ? (
        <p>No open pull requests right now.</p>
      ) : (
        <table className="stats-pr-table">
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Card</th>
              <th scope="col">Links</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ pr, reportPath, report }) => {
              const folderPath = reportPath?.split('/').slice(0, -1).join('/')
              return (
                <tr key={pr.number}>
                  <td>
                    {report?.incomplete ? (
                      <span
                        title="Needs completion — the report is missing required data"
                        aria-label="Needs completion"
                        className="stats-pr-status-incomplete"
                      >
                        ⚠️
                      </span>
                    ) : (
                      <span title="Ready for review" aria-label="Ready for review" className="stats-pr-status-ready">
                        ✅
                      </span>
                    )}
                  </td>
                  <td>{report ? `${report.card.name} (${report.card.set.toUpperCase()} #${report.card.collector_number})` : pr.title}</td>
                  <td className="stats-pr-links">
                    <a href={pr.htmlUrl} target="_blank" rel="noreferrer" title="Review on GitHub" aria-label="Review on GitHub">
                      🔀
                    </a>
                    {reportPath && (
                      <Link
                        to={`/report?owner=${pr.headOwner}&repo=${UPSTREAM_REPO.repo}&branch=${pr.headBranch}&path=${encodeURIComponent(reportPath)}`}
                        title="View in app"
                        aria-label="View in app"
                      >
                        👁
                      </Link>
                    )}
                    {folderPath && (
                      <a
                        href={`https://github.com/${pr.headOwner}/${UPSTREAM_REPO.repo}/tree/${pr.headBranch}/${folderPath}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Report folder"
                        aria-label="Report folder"
                      >
                        📁
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h2>History</h2>
      <div className="stats-charts">
        <TimeSeriesChart label="Open PRs" points={(history ?? []).map((h) => ({ date: h.date, value: h.open_prs }))} />
        <TimeSeriesChart
          label="Images in repo"
          points={(history ?? []).map((h) => ({ date: h.date, value: h.image_count }))}
        />
        <TimeSeriesChart
          label="Repo size (.git)"
          points={(history ?? []).map((h) => ({ date: h.date, value: h.repo_size_bytes }))}
          formatValue={formatBytes}
        />
      </div>
    </section>
  )
}

export default StatsDashboard
