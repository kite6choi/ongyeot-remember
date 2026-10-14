/**
 * 온곁 리멤버 - 홈 화면
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './HomeScreen.css'

interface Pet {
  id: string
  name: string
  species: string
  age_years: number
  passed_on: string
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const [pet, setPet] = useState<Pet | null>(null)
  const [daysSince, setDaysSince] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPetData()
  }, [])

  const loadPetData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 반려동물 조회
      const { data: pets, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (error || !pets) {
        console.error('[HomeScreen] 반려동물 조회 실패:', error)
        return
      }

      setPet(pets)

      // 떠난 지 N일째 계산
      const passedDate = new Date(pets.passed_on)
      const today = new Date()
      const days = Math.floor((today.getTime() - passedDate.getTime()) / (1000 * 60 * 60 * 24))
      setDaysSince(days)
    } catch (err) {
      console.error('[HomeScreen] 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="screen">
        <p>반려동물 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="screen home-screen">
      {/* 반려동물 사진 영역 */}
      <div className="pet-photo-section">
        <div className="pet-photo-placeholder">
          <p>{pet.name}</p>
        </div>
        <p className="days-since">떠나보낸 지 {daysSince}일째</p>
      </div>

      {/* 안부 문구 */}
      <div className="greeting-section">
        <p className="greeting-text">
          오늘 하루는 어떠셨어요? {pet.name} 이야기를 나누고 싶으시면 언제든 들을게요.
        </p>
      </div>

      {/* 주요 버튼 3개 */}
      <div className="action-buttons">
        <button
          className="button-primary button-large"
          onClick={() => navigate('/chat')}
        >
          이야기하기
        </button>

        <button
          className="button-secondary"
          onClick={() => navigate('/journals')}
        >
          오늘은 짧게 기록만
        </button>

        <button
          className="button-secondary"
          onClick={() => navigate('/counselor')}
        >
          상담사 연결
        </button>
      </div>
    </div>
  )
}
