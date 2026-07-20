import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar } from './Calendar'
import styles from './Log.module.css'

function todayKey() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

type Photo = {
  id: string
  image_url: string
  camera_model: string | null
  lens_model: string | null
  focal_length: number | null
  aperture: number | null
  exposure_time: number | null
  iso: number | null
  taken_at: string | null
  signedUrl?: string
}

function formatSS(t: number | null) {
  if (!t) return '—'
  return t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}`
}

export function Log() {
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string>(todayKey())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [recentRecords, setRecentRecords] = useState<{ id: string; shot_date: string; count: number }[]>([])

  // 記録がある日を取得（点の表示用）
  useEffect(() => {
    async function loadDates() {
      // 記録がある日（点の表示用）
      const { data, error } = await supabase.from('day_records').select('shot_date')
      if (error) { console.error(error); return }
      setRecordDates(new Set((data ?? []).map((r) => r.shot_date)))

      // 最近の記録（写真の枚数付きで新しい順に5件）
      const { data: recent } = await supabase
        .from('day_records')
        .select('id, shot_date, photos(count)')
        .order('shot_date', { ascending: false })
        .limit(5)

      setRecentRecords(
        (recent ?? []).map((r: any) => ({
          id: r.id,
          shot_date: r.shot_date,
          count: r.photos?.[0]?.count ?? 0,
        }))
      )
    }
    loadDates()
  }, [])

  // 選択日が変わるたび、その日の写真を取得
  useEffect(() => {
    async function loadPhotos() {
      setLoadingPhotos(true)
      setPhotos([])

      // 1. 選択日の day_record を探す
      const { data: rec } = await supabase
        .from('day_records')
        .select('id')
        .eq('shot_date', selected)
        .maybeSingle()

      if (!rec) { setLoadingPhotos(false); return } // その日は記録なし

      // 2. その記録に紐づく写真を取得
      const { data: ph, error } = await supabase
        .from('photos')
        .select('*')
        .eq('day_record_id', rec.id)
        .order('taken_at', { ascending: true })

      if (error) { console.error(error); setLoadingPhotos(false); return }

      // 3. 署名付きURLを発行
      const withUrls = await Promise.all(
        (ph ?? []).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(p.image_url, 3600)
          return { ...p, signedUrl: signed?.signedUrl }
        })
      )
      setPhotos(withUrls)
      setLoadingPhotos(false)
    }
    loadPhotos()
  }, [selected])

  return (
    <div className={styles.logWrap}>
      {/* 左：カレンダー */}
      <div className={styles.calCol}>
        <div className={styles.sectionTitle}>CALENDAR<span>カレンダー</span></div>
        <Calendar recordDates={recordDates} selected={selected} onSelect={setSelected} />
      </div>

      {/* 右：選択日の写真 */}
      <div className={styles.dayCol}>
        <h2 className={styles.dayTitle}>{selected}</h2>

        {loadingPhotos ? (
          <p style={{ color: '#999' }}>読み込み中...</p>
        ) : photos.length === 0 ? (
          <p style={{ color: '#999' }}>この日の記録はありません。</p>
        ) : (
          <div className={styles.photoGrid}>
            {photos.map((p) => (
              <div key={p.id} className={styles.card}>
                {p.signedUrl ? (
                  <img src={p.signedUrl} alt="" className={styles.img} />
                ) : (
                  <div className={styles.imgFallback}>画像を読み込めません</div>
                )}
                <div className={styles.exif}>
                  <span className={styles.model}>{p.camera_model ?? '機種不明'}</span>
                  <span className={styles.lens}>{p.lens_model ?? 'レンズ不明'}</span>
                  <span className={styles.mono}>
                    {p.focal_length ? `${p.focal_length}mm` : '—'} ・ f/{p.aperture ?? '—'} ・ {formatSS(p.exposure_time)} ・ ISO{p.iso ?? '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 最近の記録 */}
        <div className={styles.recentSection}>
          <div className={styles.sectionTitle}>LATEST<span>最近の記録</span></div>
          {recentRecords.length === 0 ? (
            <p style={{ color: '#999' }}>まだ記録がありません。</p>
          ) : (
            <ul className={styles.recentList}>
              {recentRecords.map((r) => (
                <li
                  key={r.id}
                  className={styles.recentItem}
                  onClick={() => setSelected(r.shot_date)}
                >
                  <span className={styles.recentDate}>{r.shot_date}</span>
                  <span className={styles.recentCount}>{r.count}枚</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
      </div>
    </div>
  )
}