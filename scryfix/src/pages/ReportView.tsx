import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRawJson, rawFileUrl } from '../lib/githubRead'
import type { Report, ReportAttachmentItem } from '../report/types'
import './ReportView.css'

function AttachmentList({
  items,
  folder,
  owner,
  repo,
  branch,
}: {
  items: ReportAttachmentItem[]
  folder: string
  owner: string
  repo: string
  branch: string
}) {
  if (items.length === 0) return <p>—</p>
  return (
    <div className="report-view-attachments">
      {items.map((item, index) =>
        item.type === 'image' ? (
          <a key={index} href={rawFileUrl(owner, repo, branch, `${folder}/${item.path}`)} target="_blank" rel="noreferrer">
            <img src={rawFileUrl(owner, repo, branch, `${folder}/${item.path}`)} alt={item.path} />
          </a>
        ) : (
          <a key={index} href={item.value} target="_blank" rel="noreferrer">
            {item.value}
          </a>
        ),
      )}
    </div>
  )
}

type LoadResult = { key: string; report: Report } | { key: string; error: string }

function ReportView() {
  const [params] = useSearchParams()
  const owner = params.get('owner')
  const repo = params.get('repo')
  const branch = params.get('branch')
  const path = params.get('path')
  const isValid = Boolean(owner && repo && branch && path)
  const key = `${owner}/${repo}/${branch}/${path}`

  const [result, setResult] = useState<LoadResult | null>(null)

  useEffect(() => {
    if (!owner || !repo || !branch || !path) return
    getRawJson<Report>(owner, repo, branch, path)
      .then((report) => setResult({ key, report }))
      .catch(() => setResult({ key, error: 'Could not load this report from GitHub.' }))
  }, [owner, repo, branch, path, key])

  if (!isValid) {
    return (
      <section id="center">
        <h1>Report</h1>
        <p className="wizard-error">Missing report location — this link is malformed.</p>
      </section>
    )
  }

  const current = result && result.key === key ? result : null

  if (current && 'error' in current) {
    return (
      <section id="center">
        <h1>Report</h1>
        <p className="wizard-error">{current.error}</p>
      </section>
    )
  }

  const report = current?.report ?? null
  if (!report) {
    return (
      <section id="center">
        <h1>Report</h1>
        <p>Loading report…</p>
      </section>
    )
  }

  const folder = path!.split('/').slice(0, -1).join('/')

  return (
    <section id="center" className="report-view">
      <h1>{report.card.name}</h1>
      <p className="wizard-card-context">
        {report.card.set.toUpperCase()} #{report.card.collector_number} · {report.card.lang} ·{' '}
        <a href={report.card.scryfall_url} target="_blank" rel="noreferrer">
          View on Scryfall
        </a>
      </p>
      <p>
        Error type: <code>{report.error_type}</code>
      </p>

      {report.incomplete && (
        <p className="wizard-incomplete-banner">
          Incomplete report — missing {report.missing.join(', ')}. The community can complete it later.
        </p>
      )}

      <h2>Description</h2>
      <p>{report.description.trim() || '—'}</p>

      <h2>Fix files</h2>
      <AttachmentList items={report.fix_files} folder={folder} owner={owner!} repo={repo!} branch={branch!} />

      <h2>Evidence</h2>
      <AttachmentList items={report.evidence} folder={folder} owner={owner!} repo={repo!} branch={branch!} />

      <h2>External references</h2>
      {report.external_refs.length === 0 ? (
        <p>—</p>
      ) : (
        <ul>
          {report.external_refs.map((ref, index) => (
            <li key={index}>
              <a href={ref.url} target="_blank" rel="noreferrer">
                {ref.source}
              </a>
            </li>
          ))}
        </ul>
      )}

      {Object.keys(report.details).length > 0 && (
        <details className="wizard-summary-json">
          <summary>Wizard-specific details</summary>
          <pre>{JSON.stringify(report.details, null, 2)}</pre>
        </details>
      )}

      <p>
        <a href={rawFileUrl(owner!, repo!, branch!, path!)} target="_blank" rel="noreferrer">
          View raw report.json
        </a>
      </p>
    </section>
  )
}

export default ReportView
