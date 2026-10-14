/**
 * 온곁 리멤버 - 메인 앱
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import StartScreen from './screens/StartScreen'
import HomeScreen from './screens/HomeScreen'
import ChatScreen from './screens/ChatScreen'
import JournalsScreen from './screens/JournalsScreen'
import DashboardScreen from './screens/DashboardScreen'
import TabNavigation from './components/TabNavigation'
import './tokens.css'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    // 세션 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 로딩 중
  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          {/* 시작 화면 */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/home" replace /> : <StartScreen />
            }
          />

          {/* 홈 */}
          <Route
            path="/home"
            element={
              isAuthenticated ? <HomeScreen /> : <Navigate to="/" replace />
            }
          />

          {/* 대화 */}
          <Route
            path="/chat"
            element={
              isAuthenticated ? <ChatScreen /> : <Navigate to="/" replace />
            }
          />

          {/* 저널 목록 */}
          <Route
            path="/journals"
            element={
              isAuthenticated ? <JournalsScreen /> : <Navigate to="/" replace />
            }
          />

          {/* 마음 흐름 (대시보드) */}
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <DashboardScreen /> : <Navigate to="/" replace />
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* 하단 탭 (인증된 경우에만) */}
        {isAuthenticated && <TabNavigation />}
      </div>
    </BrowserRouter>
  )
}

export default App
