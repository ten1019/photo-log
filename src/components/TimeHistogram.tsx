import * as d3 from 'd3'
import styles from './Charts.module.css'

export function TimeHistogram({ hours }: { hours: number[] }) {
  // 時間帯を4時間ずつの区間に
  const bins = [
    { label: '0-3', min: 0, max: 4 },
    { label: '4-7', min: 4, max: 8 },
    { label: '8-11', min: 8, max: 12 },
    { label: '12-15', min: 12, max: 16 },
    { label: '16-19', min: 16, max: 20 },
    { label: '20-23', min: 20, max: 24 },
  ]
  const data = bins.map((b) => ({
    label: b.label,
    count: hours.filter((h) => h >= b.min && h < b.max).length,
  }))

  const width = 100
  const height = 55
  const padding = { top: 4, right: 2, bottom: 10, left: 2 }

  const x = d3.scaleBand().domain(data.map((d) => d.label)).range([padding.left, width - padding.right]).padding(0.3)
  const maxCount = Math.max(d3.max(data, (d) => d.count) ?? 0, 1)
  const y = d3.scaleLinear().domain([0, maxCount]).range([height - padding.bottom, padding.top])

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>TIME<span>撮影時間帯</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        {data.map((d) => {
          const barX = x(d.label)!
          const barY = y(d.count)
          const barW = x.bandwidth()
          const barH = height - padding.bottom - barY
          return (
            <g key={d.label}>
              <rect x={barX} y={barY} width={barW} height={barH} className={styles.bar} rx={0.6} />
              {d.count > 0 && (
                <text x={barX + barW / 2} y={barY - 1.2} className={styles.barValue}>{d.count}</text>
              )}
              <text x={barX + barW / 2} y={height - 3} className={styles.barLabel}>{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}