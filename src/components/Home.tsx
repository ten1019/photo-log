import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Home.module.css'

type Photo = {
  taken_at: string | null
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
      const { data, error } = await supabase.from('photos').select('taken_at')
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
    </div>
  )
}