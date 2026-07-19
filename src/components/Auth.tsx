import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setMessage('')
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) setMessage(error.message)
    else if (mode === 'signup') setMessage('登録しました。ログインされない場合はメールを確認してください。')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20 }}>{mode === 'login' ? 'ログイン' : '新規登録'}</h1>
      <input
        style={{ display: 'block', width: '100%', margin: '8px 0', padding: 8 }}
        type="email" placeholder="メールアドレス"
        value={email} onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={{ display: 'block', width: '100%', margin: '8px 0', padding: 8 }}
        type="password" placeholder="パスワード"
        value={password} onChange={(e) => setPassword(e.target.value)}
      />
      <button style={{ width: '100%', padding: 8 }} onClick={handleSubmit} disabled={loading}>
        {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
      </button>
      {message && <p style={{ color: 'crimson', fontSize: 13 }}>{message}</p>}
      <p style={{ fontSize: 13, marginTop: 16 }}>
        {mode === 'login' ? 'アカウントがない？' : 'すでに登録済み？'}{' '}
        <button
          style={{ border: 'none', background: 'none', color: 'blue', cursor: 'pointer', padding: 0 }}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}
        >
          {mode === 'login' ? '新規登録' : 'ログイン'}
        </button>
      </p>
    </div>
  )
}