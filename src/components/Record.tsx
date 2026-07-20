import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './Record.module.css'

// 今日の日付を YYYY-MM-DD で返す
function today() {
  return new Date().toISOString().slice(0, 10)
}

export function Record() {
  const { session } = useAuth()
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveRecord() {
    setSaving(true)
    setMessage('')
    const { data, error } = await supabase
      .from('day_records')
      .insert({ shot_date: date, user_id: session!.user.id })
      .select()
      .single()

    if (error) {
      // 同じ日を二重登録した場合（unique制約）にも分かりやすく
      if (error.code === '23505') setMessage('その日の記録はすでに存在します。')
      else setMessage(error.message)
    } else {
      setMessage(`記録を作成しました（${data.shot_date}）`)
    }
    setSaving(false)
  }

  return (
    <div className={styles.wrap}>
      {/* 左：写真エリア（今は枠だけ） */}
      <div className={styles.left}>
        <div className={styles.leftHead}>
          <span className={styles.sectionTitle}>PHOTOS<span>ベストショット</span></span>
          <span className={styles.date}>{date}</span>
        </div>
        <div className={styles.grid}>
          <div className={styles.dropCell}>写真をドロップ（次のステップで実装）</div>
          <div className={styles.dropCell}>写真をドロップ</div>
        </div>
      </div>

      {/* 右：記録の設定 */}
      <div className={styles.right}>
        <div className={styles.field}>
          <div className={styles.label}>DATE<span>日付</span></div>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button className={styles.saveBtn} onClick={saveRecord} disabled={saving}>
          {saving ? '保存中...' : '記録を保存'}
        </button>

        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  )
}