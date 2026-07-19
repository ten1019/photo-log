import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthCtx = { session: Session | null; loading: boolean }
const Ctx = createContext<AuthCtx>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 起動時に既存セッションを確認
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    // ログイン/ログアウトのたびに更新
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}