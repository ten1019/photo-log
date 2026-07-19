import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

type Camera = {
  id: string
  name: string
  created_at: string
}

type Lens = {
  id: string
  name: string
  note: string | null
  created_at: string
}

export function MyPage() {
  const { session } = useAuth()
  const [cameras, setCameras] = useState<Camera[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lenses, setLenses] = useState<Lens[]>([])
  const [lensName, setLensName] = useState('')
  const [lensNote, setLensNote] = useState('')

  // 一覧を取得する関数
  async function fetchCameras() {
    const { data, error } = await supabase
      .from('cameras')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setCameras(data ?? [])
  }

  // 初回表示時に一覧を読み込む
  useEffect(() => {
    fetchCameras()
    fetchLenses()
  }, [])

  // ボディを1件追加する
  async function addCamera() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.from('cameras').insert({
      name: name.trim(),
      user_id: session!.user.id, // ← 誰の機材か。RLSのため必須
    })

    if (error) {
      setError(error.message)
    } else {
      setName('')        // 入力欄を空に
      await fetchCameras() // 一覧を取り直す
    }
    setLoading(false)
  }

  // ボディを1件削除する
  async function deleteCamera(id: string) {
    const { error } = await supabase.from('cameras').delete().eq('id', id)
    if (error) setError(error.message)
    else await fetchCameras() // 一覧を取り直す
  }

  // レンズの関数
  async function fetchLenses() {
    const { data, error } = await supabase
      .from('lenses')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setLenses(data ?? [])
  }

  async function addLens() {
    if (!lensName.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.from('lenses').insert({
      name: lensName.trim(),
      note: lensNote.trim() || null,
      user_id: session!.user.id,
    })
    if (error) {
      setError(error.message)
    } else {
      setLensName('')
      setLensNote('')
      await fetchLenses()
    }
    setLoading(false)
  }

  async function deleteLens(id: string) {
    const { error } = await supabase.from('lenses').delete().eq('id', id)
    if (error) setError(error.message)
    else await fetchLenses()
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>登録ボディ</h2>

      {/* 一覧 */}
      {cameras.length === 0 ? (
        <p style={{ color: '#888' }}>まだ登録がありません</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {cameras.map((c) => (
            <li key={c.id} style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{c.name}</span>
              <button
                onClick={() => deleteCamera(c.id)}
                style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 追加フォーム */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="ボディ名（例: LUMIX G9PRO）"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={addCamera} disabled={loading}>
          {loading ? '追加中...' : '＋ 追加'}
        </button>
      </div>

      <h2 style={{ marginTop: 40 }}>登録レンズ</h2>

      {lenses.length === 0 ? (
        <p style={{ color: '#888' }}>まだ登録がありません</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {lenses.map((l) => (
            <li key={l.id} style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                {l.name}
                {l.note && <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}>{l.note}</span>}
              </span>
              <button
                onClick={() => deleteLens(l.id)}
                style={{ border: 'none', background: 'none', color: '#999', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          style={{ padding: 8 }}
          placeholder="レンズ名（例: LUMIX G 25mm F1.7 ASPH.）"
          value={lensName}
          onChange={(e) => setLensName(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1, padding: 8 }}
            placeholder="補足（例: 単焦点）"
            value={lensNote}
            onChange={(e) => setLensNote(e.target.value)}
          />
          <button onClick={addLens} disabled={loading}>
            {loading ? '追加中...' : '＋ 追加'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p>}
    </div>
  )
}