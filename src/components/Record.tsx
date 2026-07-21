import { useState, useEffect } from 'react'
import exifr from 'exifr'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './Record.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Shot = {
  file: File
  fileName: string
  previewUrl: string
  title: string            // ★写真ごとのタイトル
  cameraId: string | null
  lensId: string | null
  focalLength?: number
  fNumber?: number
  exposureTime?: number
  iso?: number
  takenAt?: string
  takenAtISO?: string
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null) // ★選択中の写真
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([])
  const [lenses, setLenses] = useState<{ id: string; name: string; note: string | null }[]>([])
  // 新規登録フォームの開閉と入力
  const [showCamForm, setShowCamForm] = useState(false)
  const [newCamName, setNewCamName] = useState('')
  const [newCamNote, setNewCamNote] = useState('')
  const [showLensForm, setShowLensForm] = useState(false)
  const [newLensName, setNewLensName] = useState('')
  const [newLensNote, setNewLensNote] = useState('')

  useEffect(() => {
    async function loadGear() {
      const { data: cams } = await supabase.from('cameras').select('id, name').order('created_at')
      const { data: lens } = await supabase.from('lenses').select('id, name, note').order('created_at')
      setCameras(cams ?? [])
      setLenses(lens ?? [])
    }
    loadGear()
  }, [])

  // 写真を選んだとき、EXIF機材名に一致する登録機材があれば自動選択
  useEffect(() => {
    if (selectedIndex === null) return
    const shot = shots[selectedIndex]
    if (!shot) return

    // まだボディ未選択で、EXIFに機種名があるとき
    if (!shot.cameraId && shot.model) {
      const match = cameras.find((c) => c.name === shot.model)
      if (match) updateCamera(match.id)
    }
    // まだレンズ未選択で、EXIFにレンズ名があるとき
    if (!shot.lensId && shot.lensModel) {
      const match = lenses.find((l) => l.name === shot.lensModel)
      if (match) updateLens(match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, cameras, lenses])

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const remaining = MAX_PHOTOS - shots.length
    if (remaining <= 0) { setMessage('写真は最大4枚までです。'); return }
    const selected = Array.from(files).slice(0, remaining)
    if (files.length > remaining) setMessage(`残り${remaining}枚まで追加できます（4枚まで）。`)

    const newShots: Shot[] = []
    for (const file of selected) {
      try {
        const exif = await exifr.parse(file)
        newShots.push({
          file,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          title: '',
          cameraId: null,
          lensId: null,
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
        newShots.push({ file, fileName: file.name, previewUrl: URL.createObjectURL(file), title: '', cameraId: null, lensId: null })
      }
    }

    setShots((prev) => {
      const merged = [...prev, ...newShots]
      const firstWithDate = merged.find((s) => s.takenAt)
      if (firstWithDate?.takenAt) {
        const d = new Date(firstWithDate.takenAt)
        if (!isNaN(d.getTime())) setDate(d.toISOString().slice(0, 10))
      }
      // まだ何も選んでなければ、追加した最初の写真を選択状態に
      if (selectedIndex === null && merged.length > 0) setSelectedIndex(0)
      return merged
    })
  }

  // 選択中の写真のタイトルを更新
  function updateTitle(value: string) {
    if (selectedIndex === null) return
    setShots((prev) =>
      prev.map((s, i) => (i === selectedIndex ? { ...s, title: value } : s))
    )
  }

  function updateCamera(id: string | null) {
    if (selectedIndex === null) return
    setShots((prev) => prev.map((s, i) => (i === selectedIndex ? { ...s, cameraId: id } : s)))
  }
  function updateLens(id: string | null) {
    if (selectedIndex === null) return
    setShots((prev) => prev.map((s, i) => (i === selectedIndex ? { ...s, lensId: id } : s)))
  }

  async function createCamera() {
    if (!newCamName.trim()) return
    const { data, error } = await supabase
      .from('cameras')
      .insert({ name: newCamName.trim(), note: newCamNote.trim() || null, user_id: session!.user.id })
      .select('id, name')
      .single()
    if (error) { setMessage(error.message); return }
    setCameras((prev) => [...prev, data])   // 選択肢に追加
    updateCamera(data.id)                    // この写真に紐づけ
    setNewCamName(''); setNewCamNote(''); setShowCamForm(false)  // フォームを閉じる
  }

  // EXIF名でボディ登録フォームを開く（名前を自動で入れる）
  function openCamFormWithExif(name: string) {
    setNewCamName(name)   // 名前を自動入力
    setNewCamNote('')     // 補足は空
    setShowCamForm(true)  // フォームを開く
  }
  function openLensFormWithExif(name: string) {
    setNewLensName(name)
    setNewLensNote('')
    setShowLensForm(true)
  }

  async function createLens() {
    if (!newLensName.trim()) return
    const { data, error } = await supabase
      .from('lenses')
      .insert({ name: newLensName.trim(), note: newLensNote.trim() || null, user_id: session!.user.id })
      .select('id, name, note')
      .single()
    if (error) { setMessage(error.message); return }
    setLenses((prev) => [...prev, data])
    updateLens(data.id)
    setNewLensName(''); setNewLensNote(''); setShowLensForm(false)
  }

  // EXIFの機種名で新しいボディを台帳に登録して、選択中の写真に紐づける
  async function registerCameraFromExif(name: string) {
    const { data, error } = await supabase
      .from('cameras')
      .insert({ name, user_id: session!.user.id })
      .select('id, name')
      .single()
    if (error) { setMessage(error.message); return }
    setCameras((prev) => [...prev, data])   // 選択肢リストに追加
    updateCamera(data.id)                    // この写真に紐づける
  }

  // EXIFのレンズ名で新しいレンズを台帳に登録
  async function registerLensFromExif(name: string) {
    const { data, error } = await supabase
      .from('lenses')
      .insert({ name, user_id: session!.user.id })
      .select('id, name, note')
      .single()
    if (error) { setMessage(error.message); return }
    setLenses((prev) => [...prev, data])
    updateLens(data.id)
  }

  // 写真を1枚削除する（保存前なので配列から除くだけ）
  function removeShot(index: number) {
    setShots((prev) => {
      const next = prev.filter((_, i) => i !== index)

      // 選択中インデックスの調整
      if (next.length === 0) {
        setSelectedIndex(null)
      } else if (selectedIndex !== null) {
        if (index === selectedIndex) {
          // 選択中の写真を消した → 先頭を選び直す
          setSelectedIndex(0)
        } else if (index < selectedIndex) {
          // 選択より前を消した → 番号が1つ繰り上がる
          setSelectedIndex(selectedIndex - 1)
        }
      }
      return next
    })
  }

  async function saveRecord() {
    if (shots.length === 0) { setMessage('写真を1枚以上選んでください。'); return }
    setSaving(true)
    setMessage('')
    const userId = session!.user.id

    try {
      let recordId: string
      const { data: existing } = await supabase
        .from('day_records').select('id').eq('shot_date', date).maybeSingle()

      if (existing) recordId = existing.id
      else {
        const { data: created, error: recErr } = await supabase
          .from('day_records').insert({ shot_date: date, user_id: userId }).select('id').single()
        if (recErr) throw recErr
        recordId = created.id
      }

      for (const s of shots) {
        const ext = s.file.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/${recordId}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage.from('photos').upload(path, s.file)
        if (upErr) throw upErr

        const { error: insErr } = await supabase.from('photos').insert({
          user_id: userId,
          day_record_id: recordId,
          image_url: path,
          title: s.title.trim() || null,      // ★タイトルを保存
          camera_id: s.cameraId,
          lens_id: s.lensId,
          camera_model: s.model ?? null,
          lens_model: s.lensModel ?? null,
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
      setSelectedIndex(null)
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

  const selectedShot = selectedIndex !== null ? shots[selectedIndex] : null

  return (
    <div className={styles.wrap}>
      {/* 左：写真グリッド */}
      <div className={styles.left}>
        <div className={styles.leftHead}>
          <span className={styles.sectionTitle}>PHOTOS<span>ベストショット</span></span>
          <span className={styles.date}>{date}</span>
        </div>

        <div className={styles.grid}>
          {shots.map((s, i) => (
            <div
              key={i}
              className={`${styles.photoCell} ${i === selectedIndex ? styles.photoSelected : ''}`}
              onClick={() => setSelectedIndex(i)}
            >
              <div className={styles.photoImgWrap}>
                <img src={s.previewUrl} alt="" className={styles.photoImg} />
                <button
                  className={styles.removeBtn}
                  onClick={(e) => { e.stopPropagation(); removeShot(i) }}
                >
                  ×
                </button>
              </div>
              <div className={styles.photoTitle}>{s.title || 'タイトル未設定'}</div>
            </div>
          ))}

          {/* 空き枠（4枚未満のとき、残りをドロップ枠で埋める） */}
          {shots.length < MAX_PHOTOS && (
            <label className={styles.dropCell} style={{ cursor: 'pointer' }}>
              写真を選ぶ
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={(e) => handleFiles(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      {/* 右：選択中の写真の設定 */}
      <div className={styles.right}>
        {selectedShot ? (
          <>
            <div className={styles.field}>
              <div className={styles.label}>TITLE<span>タイトル</span></div>
              <input
                className={styles.input}
                placeholder="例: カクレクマノミ"
                value={selectedShot.title}
                onChange={(e) => updateTitle(e.target.value)}
              /> 
              <div className={styles.label}>BODY<span>使用ボディ</span></div>
              <select
                className={styles.input}
                value={selectedShot.cameraId ?? ''}
                onChange={(e) => updateCamera(e.target.value || null)}
              >
                <option value="">選択なし</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* 新規登録フォーム（開閉式） */}
              {!showCamForm ? (
                <button className={styles.newBtn} onClick={() => setShowCamForm(true)}>
                  ＋ ボディを新規登録
                </button>
              ) : (
                <div className={styles.newForm}>
                  <input className={styles.input} placeholder="ボディ名"
                    value={newCamName} onChange={(e) => setNewCamName(e.target.value)} />
                  <input className={styles.input} placeholder="補足（例: マイクロフォーサーズ）"
                    value={newCamNote} onChange={(e) => setNewCamNote(e.target.value)} />
                  <div className={styles.newFormBtns}>
                    <button className={styles.registerBtn} onClick={createCamera}>＋ 登録して選択</button>
                    <button className={styles.cancelBtn} onClick={() => setShowCamForm(false)}>取消</button>
                  </div>
                </div>
              )}

              {/* EXIFに機種名があるのに、登録機材と一致してない場合 */}
              {selectedShot.model &&
                !cameras.some((c) => c.name === selectedShot.model) &&
                !showCamForm && (
                  <button
                    className={styles.registerBtn}
                    onClick={() => openCamFormWithExif(selectedShot.model!)}
                  >
                    ＋「{selectedShot.model}」を台帳に登録
                  </button>
                )}
            </div>

            <div className={styles.field}>
              <div className={styles.label}>LENS<span>使用レンズ</span></div>
              <select
                className={styles.input}
                value={selectedShot.lensId ?? ''}
                onChange={(e) => updateLens(e.target.value || null)}
              >
                <option value="">選択なし</option>
                {lenses.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}{l.note ? `（${l.note}）` : ''}</option>
                ))}
              </select>

              {!showLensForm ? (
                <button className={styles.newBtn} onClick={() => setShowLensForm(true)}>
                  ＋ レンズを新規登録
                </button>
              ) : (
                <div className={styles.newForm}>
                  <input className={styles.input} placeholder="レンズ名"
                    value={newLensName} onChange={(e) => setNewLensName(e.target.value)} />
                  <input className={styles.input} placeholder="補足（例: 単焦点）"
                    value={newLensNote} onChange={(e) => setNewLensNote(e.target.value)} />
                  <div className={styles.newFormBtns}>
                    <button className={styles.registerBtn} onClick={createLens}>＋ 登録して選択</button>
                    <button className={styles.cancelBtn} onClick={() => setShowLensForm(false)}>取消</button>
                  </div>
                </div>
              )}

              {selectedShot.lensModel &&
                !lenses.some((l) => l.name === selectedShot.lensModel) &&
                !showLensForm && (
                  <button
                    className={styles.registerBtn}
                    onClick={() => openLensFormWithExif(selectedShot.lensModel!)}
                  >
                    ＋「{selectedShot.lensModel}」を台帳に登録
                  </button>
                )}
            </div>

            {/* 参考：この写真のEXIF（読み取り専用） */}
            <div className={styles.exifBox}>
              <div>{selectedShot.model ?? '機種不明'}</div>
              <div style={{ color: '#888' }}>{selectedShot.lensModel ?? 'レンズ不明'}</div>
              <div style={{ fontFamily: 'monospace', color: '#0b6fa4' }}>
                {selectedShot.focalLength ? `${selectedShot.focalLength}mm` : '—'} ・ f/{selectedShot.fNumber ?? '—'} ・ {formatSS(selectedShot.exposureTime)} ・ ISO{selectedShot.iso ?? '—'}
              </div>
            </div>
          </>
        ) : (
          <p style={{ color: '#999' }}>写真を選ぶと、ここで設定できます。</p>
        )}

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