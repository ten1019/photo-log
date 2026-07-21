import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Home.module.css'
import { FocalHistogram } from './FocalHistogram'
import { ApertureHistogram } from './ApertureHistogram'
import { TimeHistogram } from './TimeHistogram'
import { YearHeatmap } from './YearHeatmap'

type Photo = {
  taken_at: string | null
  focal_length: number | null
  aperture: number | null
}

// "YYYY-MM-DD"（ローカル基準）
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Home() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('photos').select('taken_at, focal_length, aperture')
      if (error) console.error(error)
      else setPhotos(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // --- 集計 ---
  const totalShots = photos.length

  // 撮影日（taken_at がある写真の日付）の集合
  const shootDays = new Set(
    photos
      .filter((p) => p.taken_at)
      .map((p) => dateKey(new Date(p.taken_at!)))
  )
  const totalDays = shootDays.size

  // 今月の枚数
  const now = new Date()
  const thisMonthShots = photos.filter((p) => {
    if (!p.taken_at) return false
    const d = new Date(p.taken_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  // 連続記録（今日から遡って、何日連続で撮影日があるか）
  function calcStreak(): number {
    let streak = 0
    const cursor = new Date()
    // 今日撮ってなければ、昨日を起点にする（今日はまだ、を許容）
    if (!shootDays.has(dateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1)
    }
    while (shootDays.has(dateKey(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }
  const streak = calcStreak()

  // 焦点距離がある写真だけ、数値の配列に
  const focals = photos
    .map((p) => p.focal_length)
    .filter((f): f is number => f != null)
  
  const apertures = photos
    .map((p) => p.aperture)
    .filter((a): a is number => a != null)

  // 撮影時刻の「時」だけを取り出す
  const hours = photos
    .filter((p) => p.taken_at)
    .map((p) => new Date(p.taken_at!).getHours())

  // 各日の撮影枚数（"YYYY-MM-DD" → 枚数）
  const dayCounts = new Map<string, number>()
  photos.forEach((p) => {
    if (!p.taken_at) return
    const d = new Date(p.taken_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  })

  if (loading) return <div style={{ padding: 40 }}>読み込み中...</div>

  const metrics = [
    { label: 'DAYS', sub: '撮影日数', value: totalDays, unit: '日' },
    { label: 'TOTAL SHOTS', sub: '総枚数', value: totalShots, unit: '枚' },
    { label: 'STREAK', sub: '連続記録', value: streak, unit: '日連続' },
    { label: 'THIS MONTH', sub: '今月', value: thisMonthShots, unit: '日' },
  ]

  return (
    <div className={styles.home}>
      <div className={styles.metrics}>
        {metrics.map((m) => (
          <div key={m.label} className={styles.metric}>
            <div className={styles.metricLabel}>{m.label}</div>
            <div className={styles.metricValue}>
              {m.value}<span className={styles.metricUnit}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <YearHeatmap dayCounts={dayCounts} />

      <div className={styles.charts}>
        <ApertureHistogram apertures={apertures} />
        <TimeHistogram hours={hours} />
        <FocalHistogram focals={focals} />
      </div>
    </div>
  )
}