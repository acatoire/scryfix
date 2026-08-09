import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TimeSeriesChart from './TimeSeriesChart'

describe('TimeSeriesChart', () => {
  it('shows a placeholder when there is no history yet', () => {
    render(<TimeSeriesChart label="Open PRs" points={[]} />)
    expect(screen.getByText(/No history yet/)).toBeInTheDocument()
  })

  it('renders the latest value and a table row per point', () => {
    render(
      <TimeSeriesChart
        label="Open PRs"
        points={[
          { date: '2026-01-01', value: 1 },
          { date: '2026-01-02', value: 3 },
        ]}
      />,
    )
    expect(screen.getByText(/Latest:/)).toBeInTheDocument()
    expect(screen.getByText('3', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 points
  })

  it('formats values with the provided formatter', () => {
    render(
      <TimeSeriesChart
        label="Repo size"
        points={[{ date: '2026-01-01', value: 2048 }]}
        formatValue={(n) => `${n / 1024} KB`}
      />,
    )
    expect(screen.getByText('2 KB', { selector: 'strong' })).toBeInTheDocument()
  })
})
