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
  title: string | null
  camera_model: string | null
  lens_model: string | null
  cameras: { name: string } | null
  lenses: { name: string } | null
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

export function Log({ onEdit }: { onEdit: (date: string) => void }) {
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string>(todayKey())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [recentRecords, setRecentRecords] = useState<{ id: string; shot_date: string; event_name: string | null; count: number }[]>([])
  const [pinnedRecords, setPinnedRecords] = useState<{ id: string; shot_date: string; event_name: string | null }[]>([])
  const [eventName, setEventName] = useState<string | null>(null)

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
        .select('id, shot_date, event_name, photos(count)')
        .order('shot_date', { ascending: false })
        .limit(5)

      setRecentRecords(
        (recent ?? []).map((r: any) => ({
          id: r.id,
          shot_date: r.shot_date,
          event_name: r.event_name,
          count: r.photos?.[0]?.count ?? 0,
        }))
      )

      // ピン留めした日
      const { data: pinned } = await supabase
        .from('day_records')
        .select('id, shot_date, event_name')
        .eq('pinned', true)
        .order('shot_date', { ascending: false })
      setPinnedRecords(pinned ?? [])
      
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
        .select('id, event_name')
        .eq('shot_date', selected)
        .maybeSingle()

      if (!rec) { setLoadingPhotos(false); return } // その日は記録なし
      setEventName(rec.event_name)

      // 2. その記録に紐づく写真を取得
      const { data: ph, error } = await supabase
        .from('photos')
        .select('*, cameras(name), lenses(name)')
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

  // 選択日のピン留めを切り替える
  async function togglePin() {
    // 選択日の記録を取得
    const { data: rec } = await supabase
      .from('day_records')
      .select('id, pinned')
      .eq('shot_date', selected)
      .maybeSingle()
    if (!rec) return // 記録がない日はピンできない

    const { error } = await supabase
      .from('day_records')
      .update({ pinned: !rec.pinned })
      .eq('id', rec.id)
    if (error) { console.error(error); return }

    // ピン一覧を取り直す
    const { data: pinned } = await supabase
      .from('day_records')
      .select('id, shot_date, event_name')
      .eq('pinned', true)
      .order('shot_date', { ascending: false })
    setPinnedRecords(pinned ?? [])
  }

  // 選択日の記録を削除する（Storageの画像も一緒に消す）
  async function deleteRecord() {
    // 確認
    if (!confirm(`${selected} の記録を削除しますか？（写真も消えます）`)) return

    // 1. 選択日の記録を取得
    const { data: rec } = await supabase
      .from('day_records')
      .select('id')
      .eq('shot_date', selected)
      .maybeSingle()
    if (!rec) return

    // 2. その記録に紐づく写真の画像パスを集める
    const { data: ph } = await supabase
      .from('photos')
      .select('image_url')
      .eq('day_record_id', rec.id)

    // 3. Storageから画像ファイルを削除
    const paths = (ph ?? []).map((p) => p.image_url)
    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('photos').remove(paths)
      if (storageErr) console.error('画像の削除に失敗', storageErr)
    }

    // 4. 記録を削除（photos行は cascade で自動的に消える）
    const { error } = await supabase.from('day_records').delete().eq('id', rec.id)
    if (error) { console.error(error); return }

    // 5. 画面の状態を更新
    setPhotos([])
    setRecordDates((prev) => {
      const next = new Set(prev)
      next.delete(selected)
      return next
    })
    setRecentRecords((prev) => prev.filter((r) => r.shot_date !== selected))
    setPinnedRecords((prev) => prev.filter((p) => p.shot_date !== selected))
  }

  // 選択中の日がピン済みか
  const isSelectedPinned = pinnedRecords.some((p) => p.shot_date === selected)

  return (
    <div className={styles.logWrap}>
      {/* 左：カレンダー */}
      <div className={styles.calCol}>
        <div className={styles.sectionTitle}>CALENDAR<span>カレンダー</span></div>
        <Calendar recordDates={recordDates} selected={selected} onSelect={setSelected} />

        {/* ピン留めした日 */}
        <div className={styles.pinnedSection}>
          <div className={styles.sectionTitle}>PINNED<span>ピン留めした日</span></div>
          {pinnedRecords.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>まだありません</p>
          ) : (
            <ul className={styles.recentList}>
              {pinnedRecords.map((p) => (
                <li
                  key={p.id}
                  className={styles.recentItem}
                  onClick={() => setSelected(p.shot_date)}
                >
                  <span className={styles.recentDate}>★ {p.shot_date}</span>
                  {p.event_name && <span className={styles.recentEvent}>{p.event_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* 右：選択日の写真 */}
      <div className={styles.dayCol}>
        <div className={styles.dayHead}>
          <h2 className={styles.dayTitle}>
            {selected}
            {eventName && <span className={styles.eventName}>{eventName}</span>}
          </h2>
          {recordDates.has(selected) && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.pinBtn} onClick={togglePin}>
                {isSelectedPinned ? '★ ピン留め中' : '☆ ピン留め'}
              </button>
              <button className={styles.editBtn} onClick={() => onEdit(selected)}>
                編集
              </button>
            </div>
          )}
        </div>

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
                  {p.title && <span className={styles.photoTitle}>{p.title}</span>}
                  <span className={styles.model}>{p.cameras?.name ?? p.camera_model ?? '機種不明'}</span>
                  <span className={styles.lens}>{p.lenses?.name ?? p.lens_model ?? 'レンズ不明'}</span>
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
                  {r.event_name && <span className={styles.recentEvent}>{r.event_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}