/**
 * 위기 안내 모달
 */

import './CrisisModal.css'

interface CrisisModalProps {
  onClose: () => void
}

export default function CrisisModal({ onClose }: CrisisModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content crisis-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">지금 많이 힘드시군요</h2>

        <div className="crisis-message">
          <p>
            지금 많이 힘드신 마음이 느껴져요. 이 이야기는 저보다 사람과 함께 나누는 것이 더 안전해요.
          </p>
          <p>
            지금 바로 전화로 이야기를 들어줄 분들이 있어요.
          </p>
        </div>

        <div className="crisis-contacts">
          <a href="tel:109" className="contact-button">
            <strong>자살예방상담전화</strong>
            <span>109</span>
          </a>

          <a href="tel:1577-0199" className="contact-button">
            <strong>정신건강위기상담</strong>
            <span>1577-0199</span>
          </a>

          <a href="tel:1566-2525" className="contact-button">
            <strong>펫로스 전화상담</strong>
            <span>1566-2525</span>
          </a>
        </div>

        <div className="modal-actions">
          <button className="button-secondary" onClick={onClose}>
            대화로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
