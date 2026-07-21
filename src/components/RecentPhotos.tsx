import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './RecentPhotos.module.css'

type Photo = {
  id: string
  image_url: string
  title: string | null
  camera_model: string | null
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

export function RecentPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    async function load() {
      // 新しい順に8枚
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('taken_at', { ascending: false, nullsFirst: false })
        .limit(8)
      if (error) { console.error(error); return }

      const withUrls = await Promise.all(
        (data ?? []).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(p.image_url, 3600)
          return { ...p, signedUrl: signed?.signedUrl }
        })
      )
      setPhotos(withUrls)
    }
    load()
  }, [])

  return (
    <div className={styles.section}>
      <div className={styles.title}>RECENT<span>最近の写真</span></div>
      {photos.length === 0 ? (
        <p style={{ color: '#999' }}>まだ写真がありません。</p>
      ) : (
        <div className={styles.grid}>
          {photos.map((p) => (
            <div key={p.id} className={styles.card}>
              {p.signedUrl ? (
                <img src={p.signedUrl} alt="" className={styles.img} />
              ) : (
                <div className={styles.imgFallback} />
              )}
              <div className={styles.meta}>
                {p.title && <div className={styles.photoTitle}>{p.title}</div>}
                <div className={styles.mono}>
                  {p.focal_length ? `${p.focal_length}mm` : '—'} ・ f/{p.aperture ?? '—'} ・ {formatSS(p.exposure_time)} ・ ISO{p.iso ?? '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}