/**
 * 7일 지난 익명 체험 계정 정리 스크립트
 *
 * 사용법:
 * 1. Supabase Dashboard → SQL Editor
 * 2. 이 스크립트 붙여넣기
 * 3. Run 실행
 *
 * 또는 CLI:
 * supabase db execute --file scripts/cleanup_trials.sql
 */

-- 1. 정리 대상 확인 (7일 지난 익명 사용자)
SELECT
  au.id,
  au.email,
  au.created_at,
  COUNT(DISTINCT p.id) as pet_count,
  COUNT(DISTINCT c.id) as conversation_count,
  COUNT(DISTINCT j.id) as journal_count
FROM auth.users au
LEFT JOIN pets p ON p.user_id = au.id
LEFT JOIN conversations c ON c.user_id = au.id
LEFT JOIN journals j ON j.user_id = au.id
WHERE au.is_anonymous = true
  AND au.created_at < NOW() - INTERVAL '7 days'
GROUP BY au.id, au.email, au.created_at
ORDER BY au.created_at;

-- 2. 실제 정리 (주석 해제 후 실행)
/*
DO $$
DECLARE
  user_record RECORD;
  deleted_count INT := 0;
BEGIN
  -- 7일 지난 익명 사용자 순회
  FOR user_record IN
    SELECT id
    FROM auth.users
    WHERE is_anonymous = true
      AND created_at < NOW() - INTERVAL '7 days'
  LOOP
    -- 관련 데이터는 CASCADE로 자동 삭제됨 (RLS 정책)
    -- 1. emotion_scores (CASCADE)
    -- 2. journals (CASCADE)
    -- 3. risk_events (CASCADE)
    -- 4. messages (CASCADE)
    -- 5. conversations (CASCADE)
    -- 6. pets (CASCADE)
    -- 7. auth.users (마지막)

    -- 사용자 삭제
    DELETE FROM auth.users WHERE id = user_record.id;
    deleted_count := deleted_count + 1;
  END LOOP;

  RAISE NOTICE '정리 완료: % 명의 익명 사용자 삭제됨', deleted_count;
END $$;
*/

-- 3. 정리 후 확인
SELECT
  COUNT(*) as remaining_anonymous_users,
  MIN(created_at) as oldest_created
FROM auth.users
WHERE is_anonymous = true;

-- 4. 스토리지 정리 (프로필 이미지, 반려동물 사진 등)
-- Supabase Dashboard → Storage → 수동 확인 필요
-- 파일명 패턴: user-id/...

/**
 * 정리 주기 권장:
 * - 수동 실행: 매주 월요일
 * - 자동화 (Supabase Cron): 매일 새벽 2시
 *
 * Cron 설정 예시 (pg_cron 확장 필요):
 *
 * SELECT cron.schedule(
 *   'cleanup-old-trials',
 *   '0 2 * * *',  -- 매일 새벽 2시
 *   $$
 *   DELETE FROM auth.users
 *   WHERE is_anonymous = true
 *     AND created_at < NOW() - INTERVAL '7 days';
 *   $$
 * );
 */
