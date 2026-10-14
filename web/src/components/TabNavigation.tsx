/**
 * 온곁 리멤버 - 하단 탭 네비게이션
 */

import { Link, useLocation } from 'react-router-dom'
import './TabNavigation.css'

const tabs = [
  { path: '/home', label: '홈' },
  { path: '/chat', label: '대화' },
  { path: '/journals', label: '기록' },
  { path: '/dashboard', label: '마음 흐름' },
]

export default function TabNavigation() {
  const location = useLocation()

  return (
    <nav className="tab-navigation">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`tab-item ${isActive ? 'active' : ''}`}
          >
            <span className="tab-label">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
