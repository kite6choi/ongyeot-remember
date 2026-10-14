/**
 * 온곁 리멤버 - 저널 검증 테스트
 *
 * AC-04-2 검증
 */

import { describe, it, expect } from 'vitest'
import { validateJournal, Journal } from './journal'

describe('저널 검증 (validateJournal)', () => {
  describe('정상 케이스', () => {
    it('정상적인 저널 JSON을 통과시켜야 한다', () => {
      const raw = {
        headline: '콩이를 떠올리며 눈물을 흘렸어요',
        scores: {
          longing: 8,
          guilt: 5,
          lethargy: 6,
          warmth: 3,
        },
        moments: ['산책할 때 꼬리 흔들던 모습', '비 오는 날 무릎에서 자던 콩이'],
        self_message: '슬퍼해도 괜찮아. 충분히 사랑했어.',
        small_step: '내일은 콩이 사진을 한 장 정리해 보자',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal).toBeDefined()
      expect(result.journal?.headline).toBe(raw.headline)
      expect(result.journal?.scores.longing).toBe(8)
      expect(result.journal?.moments).toHaveLength(2)
    })

    it('JSON 문자열도 파싱해야 한다', () => {
      const raw = JSON.stringify({
        headline: '오늘도 콩이가 보고 싶었어요',
        scores: { longing: 7, guilt: 4, lethargy: 5, warmth: 4 },
        moments: ['아침 산책'],
        self_message: '천천히 나아가고 있어요',
        small_step: '산책로를 다시 걸어볼게요',
      })

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal).toBeDefined()
    })
  })

  describe('필드 누락 처리', () => {
    it('필수 필드가 누락되면 오류를 반환해야 한다', () => {
      const raw = {
        headline: '제목만 있음',
        // scores 누락
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.some(e => e.includes('scores'))).toBe(true)
    })

    it('여러 필드가 누락되면 모든 오류를 반환해야 한다', () => {
      const raw = {
        headline: '제목만',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(1)
    })
  })

  describe('점수 보정', () => {
    it('범위를 초과한 점수를 0~10으로 제한해야 한다', () => {
      const raw = {
        headline: '제목',
        scores: {
          longing: 15,  // 10으로 제한
          guilt: -5,    // 0으로 제한
          lethargy: 7,  // 정상
          warmth: 100,  // 10으로 제한
        },
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.scores.longing).toBe(10)
      expect(result.journal?.scores.guilt).toBe(0)
      expect(result.journal?.scores.lethargy).toBe(7)
      expect(result.journal?.scores.warmth).toBe(10)
    })

    it('문자열 점수를 숫자로 변환해야 한다', () => {
      const raw = {
        headline: '제목',
        scores: {
          longing: '8',
          guilt: '5.5',  // 반올림 → 6
          lethargy: '3.2', // 반올림 → 3
          warmth: 4,
        },
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.scores.longing).toBe(8)
      expect(result.journal?.scores.guilt).toBe(6)
      expect(result.journal?.scores.lethargy).toBe(3)
      expect(result.journal?.scores.warmth).toBe(4)
    })

    it('잘못된 점수는 0으로 처리해야 한다', () => {
      const raw = {
        headline: '제목',
        scores: {
          longing: 'invalid',
          guilt: null,
          lethargy: undefined,
          warmth: NaN,
        },
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.scores.longing).toBe(0)
      expect(result.journal?.scores.guilt).toBe(0)
      expect(result.journal?.scores.lethargy).toBe(0)
      expect(result.journal?.scores.warmth).toBe(0)
    })
  })

  describe('headline 처리', () => {
    it('30자를 초과하면 자르기 해야 한다', () => {
      const longHeadline = '이것은 매우 긴 제목입니다. 30자를 초과하는 제목은 잘려야 합니다. 더 길게 써볼게요.'
      const raw = {
        headline: longHeadline,
        scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.headline.length).toBeLessThanOrEqual(30)
      expect(result.journal?.headline).toBe(longHeadline.slice(0, 30))
    })

    it('30자 이하는 그대로 유지해야 한다', () => {
      const raw = {
        headline: '콩이를 떠올리며',
        scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.headline).toBe('콩이를 떠올리며')
    })
  })

  describe('moments 처리', () => {
    it('최대 3개로 제한해야 한다', () => {
      const raw = {
        headline: '제목',
        scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
        moments: ['순간1', '순간2', '순간3', '순간4', '순간5'],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.moments).toHaveLength(3)
      expect(result.journal?.moments).toEqual(['순간1', '순간2', '순간3'])
    })

    it('빈 문자열은 제외해야 한다', () => {
      const raw = {
        headline: '제목',
        scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
        moments: ['순간1', '', '  ', '순간2'],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
      expect(result.journal?.moments).toHaveLength(2)
      expect(result.journal?.moments).toEqual(['순간1', '순간2'])
    })
  })

  describe('금지 표현 검사', () => {
    it('금지 표현이 있으면 오류를 반환해야 한다', () => {
      const raw = {
        headline: '새로 입양하세요',
        scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
        moments: [],
        self_message: '메시지',
        small_step: '한 걸음',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(false)
      expect(result.errors?.some(e => e.includes('금지 표현'))).toBe(true)
    })

    it('금지 표현이 없으면 통과해야 한다', () => {
      const raw = {
        headline: '콩이를 떠올리며',
        scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
        moments: ['산책'],
        self_message: '슬퍼해도 괜찮아',
        small_step: '사진 정리하기',
      }

      const result = validateJournal(raw)

      expect(result.ok).toBe(true)
    })
  })

  describe('엣지 케이스', () => {
    it('null 입력은 오류를 반환해야 한다', () => {
      const result = validateJournal(null)

      expect(result.ok).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('잘못된 JSON 문자열은 오류를 반환해야 한다', () => {
      const result = validateJournal('{ invalid json }')

      expect(result.ok).toBe(false)
      expect(result.errors?.some(e => e.includes('JSON 파싱'))).toBe(true)
    })
  })
})
