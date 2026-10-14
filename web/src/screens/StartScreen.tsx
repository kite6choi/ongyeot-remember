/**
 * 온곁 리멤버 - 시작 화면
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './StartScreen.css'

export default function StartScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ?start=demo 자동 진입
  useEffect(() => {
    if (searchParams.get('start') === 'demo') {
      handleStartTrial()
    }
  }, [searchParams])

  const handleStartTrial = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. 익명 로그인
      console.log('[StartScreen] 익명 로그인 시작')
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

      if (authError || !authData.user) {
        throw new Error(`익명 로그인 실패: ${authError?.message}`)
      }

      console.log(`[StartScreen] 익명 로그인 성공: ${authData.user.id}`)

      // 2. trial-seed 호출
      console.log('[StartScreen] trial-seed 호출')
      const { data: seedData, error: seedError } = await supabase.functions.invoke('trial-seed')

      if (seedError) {
        console.error('[StartScreen] trial-seed 오류:', seedError)
        // 시드 생성 실패해도 진행 (기존 데이터가 있을 수 있음)
      } else {
        console.log('[StartScreen] trial-seed 성공:', seedData)
      }

      // 3. 홈으로 이동
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('[StartScreen] 오류:', err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="start-screen">
      <div className="start-content">
        <h1 className="brand-title">온곁</h1>
        <p className="brand-subtitle">반려동물을 떠나보낸 보호자의 곁을 지키는 AI 동반자</p>

        <div className="start-actions">
          <button
            className="button-primary button-large"
            onClick={handleStartTrial}
            disabled={isLoading}
          >
            {isLoading ? '준비 중...' : '체험 시작하기'}
          </button>

          {error && <p className="error-message">{error}</p>}

          <a href="#" className="link-secondary">
            이메일로 로그인
          </a>
        </div>
      </div>

      <footer className="start-footer">
        <p className="text-muted">
          온곁은 AI 동반자입니다. 전문 상담이 필요하시면 상담사와 연결해 드립니다.
        </p>
      </footer>
    </div>
  )
}
