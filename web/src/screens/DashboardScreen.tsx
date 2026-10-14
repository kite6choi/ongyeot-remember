/**
 * 온곁 리멤버 - 마음 흐름 (대시보드) 화면
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './DashboardScreen.css'

interface Journal {
  journal_date: string
  longing: number
  guilt: number
  lethargy: number
  warmth: number
}

export default function DashboardScreen() {
  const [journals, setJournals] = useState<Journal[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 14>(7)

  useEffect(() => {
    loadJournals()
  }, [period])

  const loadJournals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - period)

      const { data, error } = await supabase
        .from('journals')
        .select('journal_date, longing, guilt, lethargy, warmth')
        .eq('user_id', user.id)
        .gte('journal_date', cutoffDate.toISOString().split('T')[0])
        .order('journal_date', { ascending: true })

      if (error) {
        console.error('[DashboardScreen] 저널 조회 실패:', error)
        return
      }

      setJournals(data || [])
    } catch (err) {
      console.error('[DashboardScreen] 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="screen"><p>로딩 중...</p></div>
  }

  const chartData = journals.map(j => ({
    date: new Date(j.journal_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    그리움: j.longing,
    죄책감: j.guilt,
    무기력: j.lethargy,
    따뜻함: j.warmth,
  }))

  return (
    <div className="screen dashboard-screen">
      <h1 className="screen-title">마음 흐름</h1>

      <div className="period-toggle">
        <button
          className={period === 7 ? 'active' : ''}
          onClick={() => setPeriod(7)}
        >
          7일
        </button>
        <button
          className={period === 14 ? 'active' : ''}
          onClick={() => setPeriod(14)}
        >
          14일
        </button>
      </div>

      {chartData.length === 0 ? (
        <p className="text-muted">아직 기록이 충분하지 않습니다.</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="그리움" stroke="#7C93B8" strokeWidth={2} />
              <Line type="monotone" dataKey="죄책감" stroke="#B88A7C" strokeWidth={2} />
              <Line type="monotone" dataKey="무기력" stroke="#9A9A9A" strokeWidth={2} />
              <Line type="monotone" dataKey="따뜻함" stroke="#8FA89B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="recovery-cards">
        <div className="card">
          <p>기록을 계속하시면 마음의 변화를 함께 살펴볼게요.</p>
        </div>
      </div>
    </div>
  )
}
