/**
 * 온곁 리멤버 - 저널 목록 화면
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './JournalsScreen.css'

interface Journal {
  id: string
  journal_date: string
  headline: string
  longing: number
  guilt: number
  lethargy: number
  warmth: number
}

export default function JournalsScreen() {
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJournals()
  }, [])

  const loadJournals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', user.id)
        .order('journal_date', { ascending: false })

      if (error) {
        console.error('[JournalsScreen] 저널 조회 실패:', error)
        return
      }

      setJournals(data || [])
    } catch (err) {
      console.error('[JournalsScreen] 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="screen"><p>로딩 중...</p></div>
  }

  return (
    <div className="screen journals-screen">
      <h1 className="screen-title">기록</h1>

      {journals.length === 0 ? (
        <p className="text-muted">아직 기록된 저널이 없습니다.</p>
      ) : (
        <div className="journals-list">
          {journals.map(journal => (
            <div key={journal.id} className="journal-item card">
              <div className="journal-date">
                {new Date(journal.journal_date).toLocaleDateString('ko-KR')}
              </div>
              <h3 className="journal-headline">{journal.headline}</h3>
              <div className="journal-scores">
                <span>그리움 {journal.longing}</span>
                <span>죄책감 {journal.guilt}</span>
                <span>무기력 {journal.lethargy}</span>
                <span>따뜻함 {journal.warmth}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
