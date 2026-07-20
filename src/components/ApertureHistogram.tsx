import * as d3 from 'd3'
import styles from './Charts.module.css'

export function ApertureHistogram({ apertures }: { apertures: number[] }) {
  // 絞りの区間（F値。この値に近いものをまとめる）
  const bins = [
    { label: 'f/1.4', min: 0, max: 1.6 },
    { label: 'f/1.8', min: 1.6, max: 2.2 },
    { label: 'f/2.8', min: 2.2, max: 3.3 },
    { label: 'f/4', min: 3.3, max: 4.8 },
    { label: 'f/5.6', min: 4.8, max: 6.7 },
    { label: 'f/8', min: 6.7, max: 9.5 },
    { label: 'f/11', min: 9.5, max: 13 },
    { label: 'f/16+', min: 13, max: Infinity },
  ]
  const data = bins.map((b) => ({
    label: b.label,
    count: apertures.filter((a) => a >= b.min && a < b.max).length,
  }))

  const width = 100
  const height = 55
  const padding = { top: 20, right: 10, bottom: 24, left: 10 }

  const x = d3.scaleBand().domain(data.map((d) => d.label)).range([padding.left, width - padding.right]).padding(0.3)
  const maxCount = d3.max(data, (d) => d.count) ?? 1
  const y = d3.scaleLinear().domain([0, maxCount]).range([height - padding.bottom, padding.top])

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>APERTURE<span>絞り値</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        {data.map((d) => {
          const barX = x(d.label)!
          const barY = y(d.count)
          const barW = x.bandwidth()
          const barH = height - padding.bottom - barY
          return (
            <g key={d.label}>
              <rect x={barX} y={barY} width={barW} height={barH} className={styles.bar} rx={2} />
              {d.count > 0 && (
                <text x={barX + barW / 2} y={barY - 4} className={styles.barValue}>{d.count}</text>
              )}
              <text x={barX + barW / 2} y={height - 8} className={styles.barLabel}>{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}