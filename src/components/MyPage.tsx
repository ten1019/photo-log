import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './MyPage.module.css'

type Camera = { id: string; name: string; note: string | null; created_at: string; count: number }
type Lens = { id: string; name: string; note: string | null; created_at: string; count: number }

export function MyPage() {
  const { session } = useAuth()
  const [cameras, setCameras] = useState<Camera[]>([])
  const [lenses, setLenses] = useState<Lens[]>([])
  const [camName, setCamName] = useState('')
  const [camNote, setCamNote] = useState('')
  const [lensName, setLensName] = useState('')
  const [lensNote, setLensNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalShots, setTotalShots] = useState(0)

  async function fetchCameras() {
    const { data, error } = await supabase
      .from('cameras')
      .select('*, photos(count)')          // ← 紐づく写真の件数も取る
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setCameras((data ?? []).map((c: any) => ({ ...c, count: c.photos?.[0]?.count ?? 0 })))
  }

  async function fetchLenses() {
    const { data, error } = await supabase
      .from('lenses')
      .select('*, photos(count)')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setLenses((data ?? []).map((l: any) => ({ ...l, count: l.photos?.[0]?.count ?? 0 })))
  }

  async function fetchTotalShots() {
    const { count, error } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
    if (!error) setTotalShots(count ?? 0)
  }

  useEffect(() => { fetchCameras(); fetchLenses(); fetchTotalShots() }, [])

  async function addCamera() {
    if (!camName.trim()) return
    setLoading(true); setError('')
    const { error } = await supabase.from('cameras').insert({
      name: camName.trim(), note: camNote.trim() || null, user_id: session!.user.id,
    })
    if (error) setError(error.message)
    else { setCamName(''); setCamNote(''); await fetchCameras() }
    setLoading(false)
  }
  async function deleteCamera(id: string) {
    const { error } = await supabase.from('cameras').delete().eq('id', id)
    if (error) setError(error.message); else await fetchCameras()
  }
  async function addLens() {
    if (!lensName.trim()) return
    setLoading(true); setError('')
    const { error } = await supabase.from('lenses').insert({
      name: lensName.trim(), note: lensNote.trim() || null, user_id: session!.user.id,
    })
    if (error) setError(error.message)
    else { setLensName(''); setLensNote(''); await fetchLenses() }
    setLoading(false)
  }
  async function deleteLens(id: string) {
    const { error } = await supabase.from('lenses').delete().eq('id', id)
    if (error) setError(error.message); else await fetchLenses()
  }

  // ボディ・レンズの中で一番古い登録日の「年」を求める
  const allDates = [...cameras, ...lenses].map((x) => x.created_at)
  const sinceYear =
    allDates.length > 0
      ? new Date(allDates.sort()[0]).getFullYear()
      : new Date().getFullYear()

  return (
    <div className={styles.page}>
      {/* 上部メトリクス */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>BODYS</div>
          <div className={styles.metricValue}>{cameras.length}<span className={styles.metricUnit}>台</span></div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>LENSES</div>
          <div className={styles.metricValue}>{lenses.length}<span className={styles.metricUnit}>本</span></div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>TOTAL SHOTS</div>
          <div className={styles.metricValue}>{totalShots}<span className={styles.metricUnit}>枚</span></div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>SINCE</div>
          <div className={styles.metricValue}>{sinceYear}<span className={styles.metricUnit}>年</span></div>
        </div>
      </div>

      {/* 2カラム本体 */}
      <div className={styles.columns}>
        {/* ボディ */}
        <div className={styles.column}>
          <div className={styles.sectionTitle}>BODIES<span>登録ボディ</span></div>
          {cameras.length === 0 ? (
            <p className={styles.empty}>まだ登録がありません</p>
          ) : (
            <ul className={styles.list}>
              {cameras.map((c) => (
                <li key={c.id} className={styles.item}>
                  <div>
                    <div className={styles.itemName}>{c.name}</div>
                    {c.note && <div className={styles.itemNote}>{c.note}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={styles.itemCount}>{c.count}枚</span>
                    <button className={styles.deleteBtn} onClick={() => deleteCamera(c.id)}>×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.form}>
            <input className={styles.input} placeholder="ボディ名（例: LUMIX G9PRO）"
              value={camName} onChange={(e) => setCamName(e.target.value)} />
            <div className={styles.rowEnd}>
              <input className={styles.input} placeholder="補足（例: フルサイズ、画素数）"
                value={camNote} onChange={(e) => setCamNote(e.target.value)} />
            </div>
            <button className={styles.addBtn} onClick={addCamera} disabled={loading}>
              {loading ? '追加中...' : '＋ ボディを追加'}
            </button>
          </div>
        </div>

        {/* レンズ */}
        <div className={styles.column}>
          <div className={styles.sectionTitle}>LENSES<span>登録レンズ</span></div>
          {lenses.length === 0 ? (
            <p className={styles.empty}>まだ登録がありません</p>
          ) : (
            <ul className={styles.list}>
              {lenses.map((l) => (
                <li key={l.id} className={styles.item}>
                  <div>
                    <div className={styles.itemName}>{l.name}</div>
                    {l.note && <div className={styles.itemNote}>{l.note}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={styles.itemCount}>{l.count}枚</span>
                    <button className={styles.deleteBtn} onClick={() => deleteLens(l.id)}>×</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.form}>
            <input className={styles.input} placeholder="レンズ名（例: LUMIX G 25mm F1.7 ASPH.）"
              value={lensName} onChange={(e) => setLensName(e.target.value)} />
            <div className={styles.rowEnd}>
              <input className={styles.input} placeholder="補足（例: 単焦点）"
                value={lensNote} onChange={(e) => setLensNote(e.target.value)} />
            </div>
            <button className={styles.addBtn} onClick={addLens} disabled={loading}>
              {loading ? '追加中...' : '＋ レンズを追加'}
            </button>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'crimson', fontSize: 13, padding: 16 }}>{error}</p>}
    </div>
  )
}