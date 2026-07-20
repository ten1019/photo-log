import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar } from './Calendar'
import styles from './Log.module.css'

function todayKey() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export function Log() {
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string>(todayKey())

  useEffect(() => {
    async function load() {
      // 記録がある日（shot_date）を全部取得
      const { data, error } = await supabase
        .from('day_records')
        .select('shot_date')
      if (error) { console.error(error); return }
      setRecordDates(new Set((data ?? []).map((r) => r.shot_date)))
    }
    load()
  }, [])

  return (
    <div className={styles.logWrap}>
      {/* 左：カレンダー */}
      <div className={styles.calCol}>
        <div className={styles.sectionTitle}>CALENDAR<span>カレンダー</span></div>
        <Calendar recordDates={recordDates} selected={selected} onSelect={setSelected} />
      </div>

      {/* 右：選択日（今は日付の確認だけ） */}
      <div className={styles.dayCol}>
        <h2 className={styles.dayTitle}>{selected}</h2>
        <p style={{ color: '#999' }}>
          {recordDates.has(selected) ? 'この日には記録があります（次のステップで写真を表示）' : 'この日の記録はありません'}
        </p>
      </div>
    </div>
  )
}