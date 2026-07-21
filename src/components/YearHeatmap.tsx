import styles from './Charts.module.css'

// "YYYY-MM-DD"（ローカル基準）
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function YearHeatmap({ dayCounts }: { dayCounts: Map<string, number> }) {
  // --- 1. 表示範囲：今日から約1年前まで ---
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 開始日 = 53週前の日曜。まず今日の週の日曜を求める
  const start = new Date(today)
  start.setDate(start.getDate() - start.getDay()) // 今週の日曜へ
  start.setDate(start.getDate() - 52 * 7)          // 52週前へ

  // --- 2. 週ごとに列を作る（各列＝日〜土の7マス）---
  const weeks: Date[][] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  // --- 3. 枚数→色の濃さ ---
  function colorFor(count: number) {
    if (count === 0) return '#ebedf0'
    if (count <= 1) return '#c6e0ef'
    if (count <= 3) return '#7bb8dd'
    if (count <= 5) return '#3d8fc4'
    return '#037FB4'
  }

  // --- 4. 描画サイズ ---
  const cell = 13     // マスのサイズ
  const gap = 3       // マスの間隔
  const leftPad = 4
  const topPad = 16   // 月ラベルのぶん
  const width = leftPad + weeks.length * (cell + gap)
  const height = topPad + 7 * (cell + gap)

  // --- 5. 月ラベル（各月の最初の週の位置に月名を出す）---
  const monthLabels: { x: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const firstDay = week[0]
    const m = firstDay.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ x: leftPad + wi * (cell + gap), label: `${m + 1}月` })
      lastMonth = m
    }
  })

  return (
    <div className={styles.heatmapCard}>
      <div className={styles.chartTitle}>ACTIVITY<span>過去1年の撮影日</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        {/* 月ラベル */}
        {monthLabels.map((m, i) => (
          <text key={i} x={m.x} y={10} className={styles.heatMonth}>{m.label}</text>
        ))}
        {/* マス */}
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day > today) return null // 未来は描かない
            const key = dateKey(day)
            const count = dayCounts.get(key) ?? 0
            return (
              <rect
                key={key}
                x={leftPad + wi * (cell + gap)}
                y={topPad + di * (cell + gap)}
                width={cell}
                height={cell}
                rx={2}
                fill={colorFor(count)}
              />
            )
          })
        )}
      </svg>
    </div>
  )
}