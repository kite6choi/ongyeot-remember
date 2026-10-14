/**
 * 저널 카드 컴포넌트
 */

import { useState } from 'react'
import './JournalCard.css'

interface Journal {
  headline: string
  scores: {
    longing: number
    guilt: number
    lethargy: number
    warmth: number
  }
  moments: string[]
  self_message: string
  small_step: string
}

interface JournalCardProps {
  journal: Journal
  onSave: (journal: Journal) => void
  onCancel: () => void
}

export default function JournalCard({ journal: initialJournal, onSave, onCancel }: JournalCardProps) {
  const [journal, setJournal] = useState(initialJournal)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(journal)
    setIsSaving(false)
  }

  return (
    <div className="journal-card">
      <h2 className="journal-title">오늘의 마음 기록</h2>

      <div className="journal-field">
        <label>한 줄 요약</label>
        <input
          type="text"
          value={journal.headline}
          onChange={e => setJournal({ ...journal, headline: e.target.value.slice(0, 30) })}
          maxLength={30}
        />
      </div>

      <div className="journal-field">
        <label>기억한 순간</label>
        {journal.moments.map((moment, idx) => (
          <input
            key={idx}
            type="text"
            value={moment}
            onChange={e => {
              const newMoments = [...journal.moments]
              newMoments[idx] = e.target.value
              setJournal({ ...journal, moments: newMoments })
            }}
          />
        ))}
      </div>

      <div className="journal-field">
        <label>나에게 하고 싶은 말</label>
        <textarea
          value={journal.self_message}
          onChange={e => setJournal({ ...journal, self_message: e.target.value })}
          rows={3}
        />
      </div>

      <div className="journal-field">
        <label>내일의 작은 걸음</label>
        <input
          type="text"
          value={journal.small_step}
          onChange={e => setJournal({ ...journal, small_step: e.target.value })}
        />
      </div>

      <div className="journal-actions">
        <button className="button-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
        <button className="button-secondary" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}
