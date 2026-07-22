import { useState } from 'react'
import { useAuth } from './lib/AuthContext'
import { Auth } from './components/Auth'
import { MyPage } from './components/MyPage'
import { Nav } from './components/Nav'
import { Record } from './components/Record'
import type { Screen } from './components/Nav'
import { Log } from './components/Log'
import { Home } from './components/Home'

function App() {
  const { session, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>('mypage')
  const [editDate, setEditDate] = useState<string | null>(null)  // ★編集対象の日

  if (loading) return <div style={{ padding: 40 }}>読み込み中...</div>
  if (!session) return <Auth />

  return (
    <div>
      <Nav 
        current={screen} 
        onChange={(s) => {
          if (s === 'record') setEditDate(null)   // タブから開いたら新規モード
          setScreen(s)
        }}
      />
      {screen === 'home' && <Home />}
      {screen === 'log' && (
        <Log onEdit={(date) => { setEditDate(date); setScreen('record') }} />
      )}
      {screen === 'mypage' && <MyPage />}
      {screen === 'record' && <Record editDate={editDate} />}
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