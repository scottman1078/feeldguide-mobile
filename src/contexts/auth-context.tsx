import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { registerExpoPushToken } from '../lib/push-registration'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  license_type: string | null
  location_city: string | null
  location_state: string | null
  onboarding_completed: number | null
  is_admin: number | null
  user_tier: string
  trust_score: number
  onboarding_step: string | null
  trial_started_at: string | null
  trial_ends_at: string | null
  trial_type: string | null
  subscription_status: string | null
  base_period_end: string | null
  cancel_at_period_end: boolean | null
  supervisor_listing_active: boolean | null
  [key: string]: unknown
}

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: number
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(1)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('fg_profiles')
        .select('id, email, full_name, avatar_url, license_type, location_city, location_state, onboarding_completed, is_admin, user_tier, trust_score, onboarding_step, trial_started_at, trial_ends_at, trial_type, subscription_status, base_period_end, cancel_at_period_end, supervisor_listing_active')
        .eq('id', userId)
        .single()
      if (data) setProfile(data as Profile)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
        registerExpoPushToken(s.user.id).catch(() => {})
      }
      setLoading(0)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
        registerExpoPushToken(s.user.id).catch(() => {})
      } else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  const value = React.useMemo(() => ({
    session, user, profile, loading, signIn, signUp, signOut, refreshProfile
  }), [session, user, profile, loading, signIn, signUp, signOut, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
