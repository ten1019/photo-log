import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Log.module.css'

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
  signedUrl?: string  // 表示用の署名付きURL
}

function formatSS(t: number | null) {
  if (!t) return '—'
  return t >= 1 ? `${t}s` : `1/${Math.round(1 / t)}`
}

export function Log() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // 1. photos を新しい順に取得
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('taken_at', { ascending: false, nullsFirst: false })

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      // 2. 各画像の署名付きURLを発行（非公開バケットのため）
      const withUrls = await Promise.all(
        (data ?? []).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(p.image_url, 3600) // 1時間有効
          return { ...p, signedUrl: signed?.signedUrl }
        })
      )

      setPhotos(withUrls)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 40 }}>読み込み中...</div>

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.title}>PHOTOS<span>保存した写真</span></span>
        <span className={styles.count}>{photos.length}枚</span>
      </div>

      {photos.length === 0 ? (
        <p style={{ color: '#999' }}>まだ写真がありません。「＋記録する」から追加してみてください。</p>
      ) : (
        <div className={styles.grid}>
          {photos.map((p) => (
            <div key={p.id} className={styles.card}>
              {p.signedUrl ? (
                <img src={p.signedUrl} alt="" className={styles.img} />
              ) : (
                <div className={styles.imgFallback}>画像を読み込めません</div>
              )}
              <div className={styles.exif}>
                <span style={{ fontSize: 12, color: '#444' }}>{p.camera_model ?? '機種不明'}</span>
                <span style={{ fontSize: 11, color: '#888' }}>{p.lens_model ?? 'レンズ不明'}</span>
                <span className={styles.mono}>
                  {p.focal_length ? `${p.focal_length}mm` : '—'} ・ f/{p.aperture ?? '—'} ・ {formatSS(p.exposure_time)} ・ ISO{p.iso ?? '—'}
                </span>
                <span className={styles.date}>
                  {p.taken_at ? new Date(p.taken_at).toLocaleDateString('ja-JP') : '日付なし'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}