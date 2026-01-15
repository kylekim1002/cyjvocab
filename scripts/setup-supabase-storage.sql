-- Supabase Storage 버킷 생성 및 정책 설정 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. Storage 버킷 생성 (이미 생성했다면 스킵)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'learning-audio',
  'learning-audio',
  true,
  10485760, -- 10MB
  ARRAY['audio/*']
)
ON CONFLICT (id) DO NOTHING;

-- 2. 업로드 정책 (Service Role만 업로드 가능)
-- 기존 정책이 있으면 삭제 후 재생성
DROP POLICY IF EXISTS "Allow admin uploads" ON storage.objects;
CREATE POLICY "Allow admin uploads"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'learning-audio');

-- 3. 읽기 정책 (모든 사용자가 읽기 가능)
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'learning-audio');

-- 완료 메시지
SELECT 'Storage bucket and policies created successfully!' AS message;
