/**
 * 상담사·비전·설정 화면
 */

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './CounselorScreen.css'

type Tab = 'counselor' | 'vision' | 'settings'

function CounselorScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('counselor')
  const [adminKey, setAdminKey] = useState('')
  const [showCost, setShowCost] = useState(false)
  const [todayCost, setTodayCost] = useState<number | null>(null)

  const handleResetTrial = async () => {
    if (!confirm('체험을 처음부터 다시 시작하시겠습니까?')) return

    try {
      await supabase.functions.invoke('trial-seed', {
        body: { reset: true }
      })
      alert('체험이 초기화되었습니다. 홈 화면으로 이동합니다.')
      window.location.href = '/home'
    } catch (error) {
      console.error('Reset error:', error)
      alert('초기화 중 오류가 발생했습니다.')
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?start=demo`
    navigator.clipboard.writeText(url)
    alert('공유 링크가 복사되었습니다.')
  }

  const handleCheckCost = () => {
    if (adminKey === 'demo2026') {
      setShowCost(true)
      // 실제로는 Edge Function을 호출해서 오늘 비용을 가져와야 함
      // v0.6에서는 mock 데이터로 표시
      setTodayCost(0.15)
    } else {
      alert('관리자 키가 올바르지 않습니다.')
    }
  }

  return (
    <div className="screen counselor-screen">
      <header className="screen-header">
        <h1>더 알아보기</h1>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'counselor' ? 'active' : ''}`}
          onClick={() => setActiveTab('counselor')}
        >
          상담사 연결
        </button>
        <button
          className={`tab ${activeTab === 'vision' ? 'active' : ''}`}
          onClick={() => setActiveTab('vision')}
        >
          서비스 비전
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          데모 설정
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'counselor' && (
          <div className="counselor-info">
            <h2>전문 상담사 연결</h2>
            <p className="info-text">
              마음 회복 과정에서 전문가의 도움이 필요하실 때, 경험 많은 펫로스 전문 상담사와 연결해 드립니다.
            </p>

            <div className="service-status">
              <strong>서비스 상태</strong>
              <p>현재 v0.8에서 제공 예정입니다.</p>
            </div>

            <div className="contact-options">
              <h3>예정된 상담 방식</h3>
              <ul>
                <li><strong>전화 상담:</strong> 편안한 시간에 전화로 이야기를 나눕니다.</li>
                <li><strong>화상 상담:</strong> 얼굴을 보며 더 깊은 교감을 나눕니다.</li>
              </ul>
            </div>

            <div className="request-notice">
              <p>상담이 필요하신 경우, 현재는 위기 지원 전화를 이용해주세요.</p>
              <p><strong>정신건강 위기상담:</strong> ☎ 1577-0199</p>
            </div>
          </div>
        )}

        {activeTab === 'vision' && (
          <div className="vision-info">
            <h2>온곁 리멤버의 비전</h2>
            <p className="vision-intro">
              반려동물과의 이별 후 마음 회복을 돕는 AI 기반 정서 지원 서비스입니다.
            </p>

            <div className="vision-stages">
              <div className="stage">
                <div className="stage-number">1</div>
                <div className="stage-content">
                  <strong>공감 대화</strong>
                  <p>AI가 보호자의 이야기를 경청하고 공감하며 함께합니다.</p>
                </div>
              </div>

              <div className="stage">
                <div className="stage-number">2</div>
                <div className="stage-content">
                  <strong>감정 기록</strong>
                  <p>매일의 마음을 저널로 남기고, 흐름을 그래프로 확인합니다.</p>
                </div>
              </div>

              <div className="stage">
                <div className="stage-number">3</div>
                <div className="stage-content">
                  <strong>안전한 지원</strong>
                  <p>위기 상황을 감지하고 즉시 전문가와 연결합니다.</p>
                </div>
              </div>

              <div className="stage">
                <div className="stage-number">4</div>
                <div className="stage-content">
                  <strong>전문 상담</strong>
                  <p>필요시 펫로스 전문 상담사와 심층 상담을 진행합니다.</p>
                </div>
              </div>

              <div className="stage">
                <div className="stage-number">5</div>
                <div className="stage-content">
                  <strong>지속 회복</strong>
                  <p>장기적인 회복 과정을 지원하고, 일상으로의 복귀를 돕습니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="demo-settings">
            <h2>데모 설정</h2>

            <div className="setting-section">
              <h3>체험 초기화</h3>
              <p>데모를 처음부터 다시 시작합니다.</p>
              <button className="btn-secondary" onClick={handleResetTrial}>
                처음부터 다시 체험
              </button>
            </div>

            <div className="setting-section">
              <h3>공유 링크</h3>
              <p>다른 분들께 데모를 공유할 수 있는 링크입니다.</p>
              <button className="btn-secondary" onClick={handleCopyLink}>
                공유 링크 복사
              </button>
            </div>

            <div className="setting-section">
              <h3>QR 코드</h3>
              <p>배포 URL 확정 후 추가 예정입니다.</p>
              <div className="qr-placeholder">
                <p>QR 이미지 예정</p>
              </div>
            </div>

            <div className="setting-section">
              <h3>관리자 기능</h3>
              <p>관리자 키를 입력하면 오늘의 AI 사용 비용을 확인할 수 있습니다.</p>
              <div className="admin-input">
                <input
                  type="password"
                  placeholder="관리자 키 입력"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
                <button className="btn-secondary" onClick={handleCheckCost}>
                  비용 확인
                </button>
              </div>
              {showCost && todayCost !== null && (
                <div className="cost-display">
                  <p>오늘의 AI 사용 비용: <strong>${todayCost.toFixed(2)}</strong></p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CounselorScreen
