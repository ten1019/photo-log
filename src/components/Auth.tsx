import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Auth.module.css'

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
    <div className={styles.wrap}>
      <div className={styles.brand}>PHOTO LOG</div>
      <div className={styles.title}>{mode === 'login' ? 'ログイン' : '新規登録'}</div>

      <div className={styles.form}>
        <input
          className={styles.input}
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={styles.input}
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        />
        <button className={styles.submit} onClick={handleSubmit} disabled={loading}>
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
        </button>

        {message && <p className={styles.message}>{message}</p>}

        <p className={styles.switch}>
          {mode === 'login' ? 'アカウントが無い？' : 'すでに登録済み？'}
          <button
            className={styles.switchBtn}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}
          >
            {mode === 'login' ? '新規登録' : 'ログイン'}
          </button>
        </p>
      </div>
    </div>
  )
}