import { useState } from 'react'
import { useAuth } from './lib/AuthContext'
import { Auth } from './components/Auth'
import { MyPage } from './components/MyPage'
import { Nav } from './components/Nav'
import { Record } from './components/Record'
import type { Screen } from './components/Nav'

function App() {
  const { session, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>('mypage')

  if (loading) return <div style={{ padding: 40 }}>読み込み中...</div>
  if (!session) return <Auth />

  return (
    <div>
      <Nav current={screen} onChange={setScreen} />
      {screen === 'home' && <Placeholder title="ホーム" />}
      {screen === 'log' && <Placeholder title="ログ" />}
      {screen === 'mypage' && <MyPage />}
      {screen === 'record' && <Record />}
    </div>
  )
}

// 未実装の画面の仮表示
function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
      {title}（準備中）
    </div>
  )
}

export default App