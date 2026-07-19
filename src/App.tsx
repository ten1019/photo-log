import { useAuth } from './lib/AuthContext'
import { Auth } from './components/Auth'
import { supabase } from './lib/supabase'

function App() {
  const { session, loading } = useAuth()

  if (loading) return <div style={{ padding: 40 }}>読み込み中...</div>
  if (!session) return <Auth />

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <p>ログイン中: {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>ログアウト</button>
    </div>
  )
}

export default App