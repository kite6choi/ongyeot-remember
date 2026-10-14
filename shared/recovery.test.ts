/**
 * 온곁 리멤버 - 회복 규칙 테스트
 *
 * AC-06-2 검증
 */

import { describe, it, expect } from 'vitest'
import { buildRecoveryCards, RecoveryCard } from './recovery'
import { Journal } from './journal'

/**
 * 테스트용 저널 생성 헬퍼
 */
function createJournal(scores: {
  longing?: number
  guilt?: number
  lethargy?: number
  warmth?: number
}): Journal {
  return {
    headline: '테스트 저널',
    scores: {
      longing: scores.longing ?? 5,
      guilt: scores.guilt ?? 5,
      lethargy: scores.lethargy ?? 5,
      warmth: scores.warmth ?? 5,
    },
    moments: [],
    self_message: '테스트 메시지',
    small_step: '테스트 한 걸음',
  }
}

describe('회복 규칙 (buildRecoveryCards)', () => {
  describe('저널 3개 미만', () => {
    it('저널이 3개 미만이면 안내 카드만 반환해야 한다', () => {
      const journals = [
        createJournal({ warmth: 6 }),
        createJournal({ warmth: 7 }),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      expect(cards).toHaveLength(1)
      expect(cards[0].type).toBe('need_more')
      expect(cards[0].message).toContain('기록이 쌓이면')
    })

    it('저널이 0개여도 안내 카드를 반환해야 한다', () => {
      const cards = buildRecoveryCards([], '콩이')

      expect(cards).toHaveLength(1)
      expect(cards[0].type).toBe('need_more')
    })
  })

  describe('무기력 3일 연속 ≥7 → 상담 제안', () => {
    it('무기력 점수가 3일 연속 7 이상이면 상담 카드가 첫 번째여야 한다 (AC-06-2)', () => {
      const journals = [
        createJournal({ lethargy: 8 }), // 최근
        createJournal({ lethargy: 7 }),
        createJournal({ lethargy: 9 }),
        createJournal({ lethargy: 5 }), // 오래됨
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      expect(cards.length).toBeGreaterThan(0)
      expect(cards[0].type).toBe('counselor')
      expect(cards[0].message).toContain('상담사')
    })

    it('무기력이 3일 연속이 아니면 상담 카드가 없어야 한다', () => {
      const journals = [
        createJournal({ lethargy: 8 }),
        createJournal({ lethargy: 4 }), // 중간에 낮음
        createJournal({ lethargy: 7 }),
        createJournal({ lethargy: 5 }),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const counselorCard = cards.find(c => c.type === 'counselor')
      expect(counselorCard).toBeUndefined()
    })

    it('무기력이 7 미만이면 상담 카드가 없어야 한다', () => {
      const journals = [
        createJournal({ lethargy: 6 }),
        createJournal({ lethargy: 6 }),
        createJournal({ lethargy: 6 }),
        createJournal({ lethargy: 5 }),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const counselorCard = cards.find(c => c.type === 'counselor')
      expect(counselorCard).toBeUndefined()
    })
  })

  describe('따뜻함 상승', () => {
    it('최근 7일 따뜻함이 이전 7일보다 1 이상 상승하면 문구를 표시해야 한다', () => {
      const journals = [
        // 최근 7일: 평균 6
        createJournal({ warmth: 7 }),
        createJournal({ warmth: 6 }),
        createJournal({ warmth: 6 }),
        createJournal({ warmth: 6 }),
        createJournal({ warmth: 5 }),
        createJournal({ warmth: 6 }),
        createJournal({ warmth: 6 }),
        // 이전 7일: 평균 4
        createJournal({ warmth: 4 }),
        createJournal({ warmth: 4 }),
        createJournal({ warmth: 4 }),
        createJournal({ warmth: 4 }),
        createJournal({ warmth: 4 }),
        createJournal({ warmth: 5 }),
        createJournal({ warmth: 3 }),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const warmthCard = cards.find(c => c.type === 'warmth_up')
      expect(warmthCard).toBeDefined()
      expect(warmthCard?.message).toContain('콩이')
      expect(warmthCard?.message).toContain('웃으며')
    })

    it('따뜻함 ≥ 5인 날 수를 정확히 계산해야 한다', () => {
      const journals = [
        // 최근 7일: 따뜻함 ≥ 5가 4일
        createJournal({ warmth: 7 }), // ≥5
        createJournal({ warmth: 6 }), // ≥5
        createJournal({ warmth: 4 }), // <5
        createJournal({ warmth: 5 }), // ≥5
        createJournal({ warmth: 3 }), // <5
        createJournal({ warmth: 6 }), // ≥5
        createJournal({ warmth: 4 }), // <5
        // 이전 7일: 평균 낮음
        createJournal({ warmth: 3 }),
        createJournal({ warmth: 3 }),
        createJournal({ warmth: 3 }),
        createJournal({ warmth: 3 }),
        createJournal({ warmth: 3 }),
        createJournal({ warmth: 3 }),
        createJournal({ warmth: 3 }),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const warmthCard = cards.find(c => c.type === 'warmth_up')
      expect(warmthCard?.message).toContain('4일')
    })

    it('저널이 14개 미만이면 따뜻함 카드가 없어야 한다', () => {
      const journals = Array(10).fill(null).map(() =>
        createJournal({ warmth: 8 })
      )

      const cards = buildRecoveryCards(journals, '콩이')

      const warmthCard = cards.find(c => c.type === 'warmth_up')
      expect(warmthCard).toBeUndefined()
    })
  })

  describe('죄책감 하락', () => {
    it('죄책감이 첫 저널 대비 2 이상 하락하면 문구를 표시해야 한다', () => {
      const journals = [
        createJournal({ guilt: 3 }), // 최근
        createJournal({ guilt: 4 }),
        createJournal({ guilt: 5 }),
        createJournal({ guilt: 8 }), // 첫 저널 (가장 오래됨)
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const guiltCard = cards.find(c => c.type === 'guilt_down')
      expect(guiltCard).toBeDefined()
      expect(guiltCard?.message).toContain('마음의 짐')
      expect(guiltCard?.message).toContain('가벼워')
    })

    it('죄책감 하락이 2 미만이면 카드가 없어야 한다', () => {
      const journals = [
        createJournal({ guilt: 6 }), // 최근
        createJournal({ guilt: 6 }),
        createJournal({ guilt: 7 }),
        createJournal({ guilt: 7 }), // 첫 저널
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const guiltCard = cards.find(c => c.type === 'guilt_down')
      expect(guiltCard).toBeUndefined()
    })

    it('죄책감이 증가하면 카드가 없어야 한다', () => {
      const journals = [
        createJournal({ guilt: 8 }), // 최근 (증가)
        createJournal({ guilt: 7 }),
        createJournal({ guilt: 6 }),
        createJournal({ guilt: 5 }), // 첫 저널
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      const guiltCard = cards.find(c => c.type === 'guilt_down')
      expect(guiltCard).toBeUndefined()
    })
  })

  describe('우선순위 정렬', () => {
    it('상담 카드가 다른 카드보다 우선순위가 높아야 한다', () => {
      const journals = [
        // 무기력 3일 연속 ≥7
        createJournal({ lethargy: 8, guilt: 3, warmth: 7 }),
        createJournal({ lethargy: 7, guilt: 4, warmth: 6 }),
        createJournal({ lethargy: 9, guilt: 5, warmth: 6 }),
        createJournal({ guilt: 8, warmth: 4 }),
        // 총 14일치 (따뜻함 카드 활성화)
        ...Array(10).fill(null).map(() =>
          createJournal({ warmth: 3, guilt: 8 })
        ),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      // 상담 카드가 첫 번째여야 함
      expect(cards.length).toBeGreaterThan(1)
      expect(cards[0].type).toBe('counselor')
    })

    it('여러 조건이 만족되면 모든 카드를 반환해야 한다', () => {
      const journals = [
        // 최근 7일
        createJournal({ lethargy: 8, guilt: 2, warmth: 7 }),
        createJournal({ lethargy: 7, guilt: 2, warmth: 6 }),
        createJournal({ lethargy: 9, guilt: 3, warmth: 6 }),
        createJournal({ lethargy: 6, guilt: 3, warmth: 5 }),
        createJournal({ lethargy: 5, guilt: 3, warmth: 6 }),
        createJournal({ lethargy: 4, guilt: 4, warmth: 6 }),
        createJournal({ lethargy: 4, guilt: 4, warmth: 7 }),
        // 이전 7일
        ...Array(7).fill(null).map(() =>
          createJournal({ warmth: 3, guilt: 8 })
        ),
      ]

      const cards = buildRecoveryCards(journals, '콩이')

      // 상담, 따뜻함, 죄책감 카드 모두 있어야 함
      expect(cards.length).toBe(3)
      expect(cards.some(c => c.type === 'counselor')).toBe(true)
      expect(cards.some(c => c.type === 'warmth_up')).toBe(true)
      expect(cards.some(c => c.type === 'guilt_down')).toBe(true)
    })
  })
})
