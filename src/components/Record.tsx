import { useState } from 'react'
import exifr from 'exifr'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './Record.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

// 読み取ったEXIFを画面表示用にまとめる型
type Shot = {
  fileName: string
  previewUrl: string      // 画面プレビュー用のURL
  focalLength?: number
  fNumber?: number
  exposureTime?: number
  iso?: number
  takenAt?: string
  make?: string
  model?: string
  lensModel?: string
}

export function Record() {
  const { session } = useAuth()
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [shots, setShots] = useState<Shot[]>([])

  // ファイルが選ばれたときの処理
  const MAX_PHOTOS = 4

  async function handleFiles(files: FileList | null) {
    if (!files) return

    // 現在の枚数と合わせて4枚を超えないよう調整
    const remaining = MAX_PHOTOS - shots.length
    if (remaining <= 0) {
      setMessage('写真は最大4枚までです。')
      return
    }
    const selected = Array.from(files).slice(0, remaining)
    if (files.length > remaining) {
      setMessage(`残り${remaining}枚まで追加できます（4枚まで）。`)
    }

    const newShots: Shot[] = []
    for (const file of selected) {
      try {
        const exif = await exifr.parse(file)
        console.log(`--- ${file.name} のEXIF ---`, exif)
        newShots.push({
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          focalLength: exif?.FocalLength,
          fNumber: exif?.FNumber,
          exposureTime: exif?.ExposureTime,
          iso: exif?.ISO,
          takenAt: exif?.DateTimeOriginal?.toString(),
          make: exif?.Make,
          model: exif?.Model,
          lensModel: exif?.LensModel,
        })
      } catch (e) {
        console.error(`${file.name} のEXIF読み取り失敗`, e)
        newShots.push({ fileName: file.name, previewUrl: URL.createObjectURL(file) })
      }
    }
    setShots((prev) => {
      const merged = [...prev, ...newShots]
      // まだ手で触ってない前提で、先頭写真の撮影日を日付欄に反映
      const firstWithDate = merged.find((s) => s.takenAt)
      if (firstWithDate?.takenAt) {
        const d = new Date(firstWithDate.takenAt)
        if (!isNaN(d.getTime())) {
          setDate(d.toISOString().slice(0, 10))
        }
      }
      return merged
    })
  }

  async function saveRecord() {
    setSaving(true)
    setMessage('')
    const { data, error } = await supabase
      .from('day_records')
      .insert({ shot_date: date, user_id: session!.user.id })
      .select()
      .single()
    if (error) {
      if (error.code === '23505') setMessage('その日の記録はすでに存在します。')
      else setMessage(error.message)
    } else {
      setMessage(`記録を作成しました（${data.shot_date}）`)
    }
    setSaving(false)
  }

  // SSを 1/x 表記に
  function formatSS(t?: number) {
    if (!t) return '—'
    return t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}`
  }

  return (
    <div className={styles.wrap}>
      {/* 左：写真エリア */}
      <div className={styles.left}>
        <div className={styles.leftHead}>
          <span className={styles.sectionTitle}>PHOTOS<span>ベストショット</span></span>
          <span className={styles.date}>{date}</span>
        </div>

        {/* 4枚未満のときだけ選択ボタンを出す */}
        {shots.length < MAX_PHOTOS && (
          <label className={styles.dropCell} style={{ display: 'block', cursor: 'pointer', marginBottom: 16 }}>
            写真を選ぶ（残り{MAX_PHOTOS - shots.length}枚）
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}

        {/* 読み取り結果 */}
        <div className={styles.grid}>
          {shots.map((s, i) => (
            <div key={i} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 10 }}>
              <img src={s.previewUrl} alt="" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ fontSize: 12, marginTop: 8, color: '#444', lineHeight: 1.7 }}>
                <div>{s.model ?? '機種不明'}</div>
                <div>{s.lensModel ?? 'レンズ不明'}</div>
                <div style={{ fontFamily: 'monospace', color: '#0b6fa4' }}>
                  {s.focalLength ? `${s.focalLength}mm` : '—'} ・ f/{s.fNumber ?? '—'} ・ {formatSS(s.exposureTime)} ・ ISO{s.iso ?? '—'}
                </div>
                <div style={{ color: '#999' }}>{s.takenAt ?? '撮影日時なし'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右：記録の設定 */}
      <div className={styles.right}>
        <div className={styles.field}>
          <div className={styles.label}>DATE<span>日付</span></div>
          <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className={styles.saveBtn} onClick={saveRecord} disabled={saving}>
          {saving ? '保存中...' : '記録を保存'}
        </button>
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  )
}