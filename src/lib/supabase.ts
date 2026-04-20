import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = 'https://tidgmxqjqwhkxblceebm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZGdteHFqcXdoa3hibGNlZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODUxMTcsImV4cCI6MjA5MDA2MTExN30.VRP4x1yJaxLZA764vy14mCzZDjJZBfPpq1G9omVbQbo'

// Simple in-memory storage that works in Expo Go
// Will be replaced with SecureStore for production builds
const memoryStorage: Record<string, string> = {}
const storage = {
  getItem: async (key: string) => memoryStorage[key] ?? null,
  setItem: async (key: string, value: string) => { memoryStorage[key] = value },
  removeItem: async (key: string) => { delete memoryStorage[key] },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
