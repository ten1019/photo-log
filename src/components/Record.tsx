import { useState, useEffect } from 'react'
import exifr from 'exifr'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './Record.module.css'

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Shot = {
  id?: string
  file?: File
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

export function Record({ editDate }: { editDate?: string | null }) {
  const { session } = useAuth()
  const [date, setDate] = useState(today())
  const [eventName, setEventName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [shots, setShots] = useState<Shot[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null) // ★選択中の写真
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([])
  const [lenses, setLenses] = useState<{ id: string; name: string; note: string | null }[]>([])
  const [deletedPhotos, setDeletedPhotos] = useState<{ id: string; path: string }[]>([])
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

  const isEditMode = !!editDate

  // 編集モード：その日の記録を読み込んでフォームに入れる
  useEffect(() => {
    if (!editDate) return
    async function loadExisting() {
      setDate(editDate!)

      const { data: rec } = await supabase
        .from('day_records')
        .select('id, event_name')
        .eq('shot_date', editDate!)
        .maybeSingle()
      if (!rec) return
      setEventName(rec.event_name ?? '')

      const { data: ph } = await supabase
        .from('photos')
        .select('*')
        .eq('day_record_id', rec.id)
        .order('taken_at', { ascending: true })

      const loaded: Shot[] = await Promise.all(
        (ph ?? []).map(async (p: any) => {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(p.image_url, 3600)
          return {
            id: p.id,
            fileName: p.image_url,
            previewUrl: signed?.signedUrl ?? '',
            title: p.title ?? '',
            cameraId: p.camera_id,
            lensId: p.lens_id,
            focalLength: p.focal_length ?? undefined,
            fNumber: p.aperture ?? undefined,
            exposureTime: p.exposure_time ?? undefined,
            iso: p.iso ?? undefined,
            takenAt: p.taken_at ?? undefined,
            takenAtISO: p.taken_at ?? undefined,
            model: p.camera_model ?? undefined,
            lensModel: p.lens_model ?? undefined,
          }
        })
      )
      setShots(loaded)
      if (loaded.length > 0) setSelectedIndex(0)
    }
    loadExisting()
  }, [editDate])

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

  // 写真を1枚削除する（保存前なので配列から除くだけ）
  function removeShot(index: number) {
    const target = shots[index]
    // 既存写真なら、保存時に消すリストへ
    if (target?.id) {
      setDeletedPhotos((prev) => [...prev, { id: target.id!, path: target.fileName }])
    }

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
    if (shots.length === 0 && deletedPhotos.length === 0) { setMessage('写真を1枚以上選んでください。'); return }
    setSaving(true)
    setMessage('')
    const userId = session!.user.id

    try {
      let recordId: string
      const { data: existing } = await supabase
        .from('day_records').select('id').eq('shot_date', date).maybeSingle()

      if (existing) {
        recordId = existing.id
        await supabase
          .from('day_records')
          .update({ event_name: eventName.trim() || null })
          .eq('id', recordId)
      } else {
        const { data: created, error: recErr } = await supabase
          .from('day_records')
          .insert({ shot_date: date, user_id: userId, event_name: eventName.trim() || null })
          .select('id').single()
        if (recErr) throw recErr
        recordId = created.id
      }

      for (const s of shots) {
        if (s.id) {
          // --- 既存写真：タイトル・機材だけ更新 ---
          const { error: updErr } = await supabase
            .from('photos')
            .update({
              title: s.title.trim() || null,
              camera_id: s.cameraId,
              lens_id: s.lensId,
            })
            .eq('id', s.id)
          if (updErr) throw updErr
        } else if (s.file) {
          // --- 新規写真：アップロード＋登録 ---
          const ext = s.file.name.split('.').pop() ?? 'jpg'
          const path = `${userId}/${recordId}/${crypto.randomUUID()}.${ext}`
          const { error: upErr } = await supabase.storage.from('photos').upload(path, s.file)
          if (upErr) throw upErr

          const { error: insErr } = await supabase.from('photos').insert({
            user_id: userId,
            day_record_id: recordId,
            image_url: path,
            title: s.title.trim() || null,
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
      }

      // 削除された既存写真をDBとStorageから消す
      if (deletedPhotos.length > 0) {
        const paths = deletedPhotos.map((d) => d.path)
        const { error: storageErr } = await supabase.storage.from('photos').remove(paths)
        if (storageErr) console.error('画像の削除に失敗', storageErr)

        const ids = deletedPhotos.map((d) => d.id)
        const { error: delErr } = await supabase.from('photos').delete().in('id', ids)
        if (delErr) throw delErr

        setDeletedPhotos([])   // リセット
      }

      setMessage(isEditMode ? '変更を保存しました' : `保存しました（${shots.length}枚）`)
      if (!isEditMode) {
        setShots([])
        setSelectedIndex(null)
        setEventName('')
      }
    } catch (e: any) {
      setMessage(`保存エラー: ${e.message ?? e}`)
    } finally {
      setSaving(false)
    }
  }

  // 削除関数

  async function deleteWholeRecord() {
    if (!editDate) return
    if (!confirm(`${editDate} の記録を削除しますか？（写真も消えます）`)) return

    const { data: rec } = await supabase
      .from('day_records').select('id').eq('shot_date', editDate).maybeSingle()
    if (!rec) return

    const { data: ph } = await supabase
      .from('photos').select('image_url').eq('day_record_id', rec.id)
    const paths = (ph ?? []).map((p) => p.image_url)
    if (paths.length > 0) {
      await supabase.storage.from('photos').remove(paths)
    }

    const { error } = await supabase.from('day_records').delete().eq('id', rec.id)
    if (error) { setMessage(error.message); return }

    setMessage('記録を削除しました')
    setShots([])
    setSelectedIndex(null)
    setEventName('')
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
                placeholder="例: 夜景"
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
                    ＋「{selectedShot.model}」を新規登録
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
                    ＋「{selectedShot.lensModel}」を新規登録
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

        <div className={styles.field}>
          <div className={styles.label}>EVENT<span>この日のタイトル</span></div>
          <input
            className={styles.input}
            placeholder="例: 東京観光"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <button className={styles.saveBtn} onClick={saveRecord} disabled={saving}>
          {saving ? '保存中...' : isEditMode ? '変更を保存' : '記録を保存'}
        </button>
        {isEditMode && (
          <button className={styles.deleteRecordBtn} onClick={deleteWholeRecord}>
            この記録を削除
          </button>
        )}
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  )
}