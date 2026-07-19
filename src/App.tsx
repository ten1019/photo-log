import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function App() {
  const [status, setStatus] = useState('確認中...')

  useEffect(() => {
    supabase.from('cameras').select('*').then(({ error }) => {
      setStatus(error ? `エラー: ${error.message}` : '接続OK ✅')
    })
  }, [])

  return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>{status}</div>
}

export default App