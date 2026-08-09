interface TimeSeriesPoint {
  date: string
  value: number
}

interface TimeSeriesChartProps {
  label: string
  points: TimeSeriesPoint[]
  formatValue?: (value: number) => string
}

const WIDTH = 300
const HEIGHT = 80
const PAD_X = 10
const PAD_Y = 10

function TimeSeriesChart({ label, points, formatValue = String }: TimeSeriesChartProps) {
  if (points.length === 0) {
    return (
      <figure className="time-series-chart">
        <h3>{label}</h3>
        <p className="time-series-chart-empty">No history yet — check back after the next daily snapshot.</p>
      </figure>
    )
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const coords = points.map((point, index) => {
    const x = points.length === 1 ? WIDTH / 2 : PAD_X + (index / (points.length - 1)) * (WIDTH - PAD_X * 2)
    const y = HEIGHT - PAD_Y - ((point.value - min) / span) * (HEIGHT - PAD_Y * 2)
    return { ...point, x, y }
  })

  const linePath = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const last = coords[coords.length - 1]

  return (
    <figure className="time-series-chart">
      <h3>{label}</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${label} over time`}>
        <line x1={PAD_X} y1={PAD_Y} x2={WIDTH - PAD_X} y2={PAD_Y} className="time-series-chart-grid" />
        <line
          x1={PAD_X}
          y1={HEIGHT - PAD_Y}
          x2={WIDTH - PAD_X}
          y2={HEIGHT - PAD_Y}
          className="time-series-chart-grid"
        />
        {coords.length > 1 && <polyline points={linePath} className="time-series-chart-line" />}
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r={8} className="time-series-chart-hit">
            <title>
              {c.date}: {formatValue(c.value)}
            </title>
          </circle>
        ))}
        <circle cx={last.x} cy={last.y} r={4} className="time-series-chart-last" />
      </svg>
      <p className="time-series-chart-latest">
        Latest: <strong>{formatValue(last.value)}</strong> ({last.date})
      </p>
      <details className="time-series-chart-table">
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">{label}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                <td>{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

export default TimeSeriesChart
