import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tidgmxqjqwhkxblceebm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZGdteHFqcXdoa3hibGNlZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODUxMTcsImV4cCI6MjA5MDA2MTExN30.VRP4x1yJaxLZA764vy14mCzZDjJZBfPpq1G9omVbQbo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
