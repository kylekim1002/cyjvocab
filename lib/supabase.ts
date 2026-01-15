import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Supabase 클라이언트 생성 (환경 변수가 없으면 빈 클라이언트)
export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Storage 버킷 이름
export const STORAGE_BUCKET = 'learning-audio'

// Supabase가 설정되었는지 확인
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseServiceKey && supabase)
}
