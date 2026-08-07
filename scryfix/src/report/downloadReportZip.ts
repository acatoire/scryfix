import type { Report } from './types'

export async function downloadReportZip(report: Report, files: { path: string; file: File }[]): Promise<void> {
  // jszip is only needed once someone actually downloads a report — keep it out of the main bundle.
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('report.json', JSON.stringify(report, null, 2))
  for (const { path, file } of files) {
    zip.file(path, file)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${report.report_id}.zip`
  link.click()
  // Revoking synchronously can cancel the download in some browsers (e.g. Firefox) — give it a tick.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
