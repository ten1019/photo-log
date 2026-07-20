import { useState } from 'react'
import exifr from 'exifr'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './Record.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Shot = {
  file: File               // ★アップロード用に実ファイルを保持
  fileName: string
  previewUrl: string
  focalLength?: number
  fNumber?: number
  exposureTime?: number
  iso?: number
  takenAt?: string         // 画面表示用
  takenAtISO?: string      // ★DB保存用（ISO形式）
  make?: string
  model?: string
  lensModel?: string
}

const MAX_PHOTOS = 4

export function Record() {
  const { session } = useAuth()
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [shots, setShots] = useState<Shot[]>([])

  async function handleFiles(files: FileList | null) {
    if (!files) return
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
          file,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          focalLength: exif?.FocalLength,
          fNumber: exif?.FNumber,
          exposureTime: exif?.ExposureTime,
          iso: exif?.ISO,
          takenAt: exif?.DateTimeOriginal?.toString(),
          takenAtISO: exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : undefined,
          make: exif?.Make,
          model: exif?.Model,
          lensModel: exif?.LensModel,
        })
      } catch (e) {
        console.error(`${file.name} のEXIF読み取り失敗`, e)
        newShots.push({ file, fileName: file.name, previewUrl: URL.createObjectURL(file) })
      }
    }

    setShots((prev) => {
      const merged = [...prev, ...newShots]
      const firstWithDate = merged.find((s) => s.takenAt)
      if (firstWithDate?.takenAt) {
        const d = new Date(firstWithDate.takenAt)
        if (!isNaN(d.getTime())) setDate(d.toISOString().slice(0, 10))
      }
      return merged
    })
  }

  async function saveRecord() {
    if (shots.length === 0) {
      setMessage('写真を1枚以上選んでください。')
      return
    }
    setSaving(true)
    setMessage('')
    const userId = session!.user.id

    try {
      // 1. その日の記録を用意（あれば使う・なければ作る）
      let recordId: string
      const { data: existing } = await supabase
        .from('day_records')
        .select('id')
        .eq('shot_date', date)
        .maybeSingle()

      if (existing) {
        recordId = existing.id
      } else {
        const { data: created, error: recErr } = await supabase
          .from('day_records')
          .insert({ shot_date: date, user_id: userId })
          .select('id')
          .single()
        if (recErr) throw recErr
        recordId = created.id
      }

      // 2. 各写真を Storage にアップ → photos に保存
      for (const s of shots) {
        const ext = s.file.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${recordId}/${crypto.randomUUID()}.${ext}`

        const { error: upErr } = await supabase.storage.from('photos').upload(path, s.file)
        if (upErr) throw upErr

        const { error: insErr } = await supabase.from('photos').insert({
          user_id: userId,
          day_record_id: recordId,
          image_url: path,
          focal_length: s.focalLength ?? null,
          aperture: s.fNumber ?? null,
          exposure_time: s.exposureTime ?? null,
          iso: s.iso ?? null,
          taken_at: s.takenAtISO ?? null,
        })
        if (insErr) throw insErr
      }

      setMessage(`保存しました（${shots.length}枚）`)
      setShots([])
    } catch (e: any) {
      setMessage(`保存エラー: ${e.message ?? e}`)
    } finally {
      setSaving(false)
    }
  }

  function formatSS(t?: number) {
    if (!t) return '—'
    return t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}`
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        <div className={styles.leftHead}>
          <span className={styles.sectionTitle}>PHOTOS<span>ベストショット</span></span>
          <span className={styles.date}>{date}</span>
        </div>

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