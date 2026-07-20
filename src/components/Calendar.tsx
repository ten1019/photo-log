import { useState } from 'react'
import styles from './Calendar.module.css'

// 日付を "YYYY-MM-DD" 文字列にする（ローカル時間基準）
function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function Calendar({
  recordDates,
  selected,
  onSelect,
}: {
  recordDates: Set<string>   // 記録がある日（"YYYY-MM-DD"の集合）
  selected: string           // 選択中の日（"YYYY-MM-DD"）
  onSelect: (dateKey: string) => void
}) {
  // 表示中の年月（初期は今月）
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate())

  const firstDay = new Date(year, month, 1).getDay() // その月1日の曜日(0=日)
  const daysInMonth = new Date(year, month + 1, 0).getDate() // その月の日数

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  // 空セル（1日までの曜日埋め）＋日セル
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={styles.cal}>
      <div className={styles.head}>
        <span className={styles.month}>{year} · {month + 1}月</span>
        <div className={styles.nav}>
          <button onClick={prevMonth}>‹</button>
          <button onClick={nextMonth}>›</button>
        </div>
      </div>

      <div className={styles.weekdays}>
        {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className={styles.empty} />
          const key = toKey(year, month, d)
          const hasRecord = recordDates.has(key)
          const isSelected = key === selected
          const isToday = key === todayKey
          return (
            <button
              key={i}
              className={`${styles.day} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
              onClick={() => onSelect(key)}
            >
              {d}
              {hasRecord && <span className={styles.dot} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}