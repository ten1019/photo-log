import { useAuth } from './lib/AuthContext'
import { Auth } from './components/Auth'
import { MyPage } from './components/MyPage'
import { supabase } from './lib/supabase'

function App() {
  const { session, loading } = useAuth()

  if (loading) return <div style={{ padding: 40 }}>読み込み中...</div>
  if (!session) return <Auth />

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div style={{ padding: '12px 40px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <span>{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()}>ログアウト</button>
      </div>
      <MyPage />
    </div>
  )
}

export default App