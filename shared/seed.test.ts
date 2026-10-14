/**
 * 온곁 리멤버 - 시드 데이터 테스트
 *
 * AC-01-1 검증
 */

import { describe, it, expect } from 'vitest'
import { generateSeedData, calculateDaysSince } from './seed'
import { validateJournal } from './journal'
import { buildRecoveryCards } from './recovery'

describe('시드 데이터 (generateSeedData)', () => {
  describe('기본 구조', () => {
    it('반려동물, 추억, 저널 데이터를 반환해야 한다', () => {
      const seed = generateSeedData()

      expect(seed.pet).toBeDefined()
      expect(seed.pet.name).toBe('콩이')
      expect(seed.pet.species).toBe('몰티즈')
      expect(seed.pet.age_years).toBe(14)

      expect(seed.memories).toHaveLength(3)
      expect(seed.journals).toHaveLength(7)
    })

    it('추억 3개가 정확한 내용이어야 한다', () => {
      const seed = generateSeedData()

      expect(seed.memories[0].note).toBe('바닷가에서 꼬리 흔들던 날')
      expect(seed.memories[1].note).toBe('비 오는 날 내 무릎에서 자던 콩이')
      expect(seed.memories[2].note).toBe('산책 끝나면 꼭 물 한 그릇')
    })
  })

  describe('상대 날짜 계산', () => {
    it('떠난 날이 기준일 15일 전이어야 한다', () => {
      const baseDate = new Date('2026-10-14')
      const seed = generateSeedData(baseDate)

      const daysSince = calculateDaysSince(seed.pet.passed_on, baseDate)
      expect(daysSince).toBe(15)
    })

    it('오늘 날짜를 바꿔도 15일째가 유지되어야 한다', () => {
      const date1 = new Date('2026-10-14')
      const date2 = new Date('2026-11-20')
      const date3 = new Date('2027-01-05')

      const seed1 = generateSeedData(date1)
      const seed2 = generateSeedData(date2)
      const seed3 = generateSeedData(date3)

      expect(calculateDaysSince(seed1.pet.passed_on, date1)).toBe(15)
      expect(calculateDaysSince(seed2.pet.passed_on, date2)).toBe(15)
      expect(calculateDaysSince(seed3.pet.passed_on, date3)).toBe(15)
    })
  })

  describe('저널 검증', () => {
    it('시드 저널이 validateJournal을 통과해야 한다', () => {
      const seed = generateSeedData()

      for (const journal of seed.journals) {
        const result = validateJournal(journal)
        expect(result.ok).toBe(true)
      }
    })

    it('저널 7일치가 모두 유효한 점수(0~10)여야 한다', () => {
      const seed = generateSeedData()

      for (const journal of seed.journals) {
        expect(journal.scores.longing).toBeGreaterThanOrEqual(0)
        expect(journal.scores.longing).toBeLessThanOrEqual(10)
        expect(journal.scores.guilt).toBeGreaterThanOrEqual(0)
        expect(journal.scores.guilt).toBeLessThanOrEqual(10)
        expect(journal.scores.lethargy).toBeGreaterThanOrEqual(0)
        expect(journal.scores.lethargy).toBeLessThanOrEqual(10)
        expect(journal.scores.warmth).toBeGreaterThanOrEqual(0)
        expect(journal.scores.warmth).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('회복 문구 생성', () => {
    it('시드 저널로 buildRecoveryCards가 회복 문구를 만들어야 한다', () => {
      const seed = generateSeedData()
      const cards = buildRecoveryCards(seed.journals.reverse(), '콩이')

      // 저널이 7개 있으므로 need_more 카드는 없어야 함
      expect(cards.some(c => c.type === 'need_more')).toBe(false)

      // 죄책감 하락 (8→4) 문구가 있어야 함
      const guiltCard = cards.find(c => c.type === 'guilt_down')
      expect(guiltCard).toBeDefined()

      // 따뜻함 상승 문구는 14일치가 있어야 나타나므로 없을 수 있음
      // (7일치만 있으므로 없는 것이 정상)
    })

    it('죄책감이 첫 저널(8) 대비 마지막(4)에서 2 이상 하락해야 한다', () => {
      const seed = generateSeedData()
      const journals = seed.journals

      // 첫 저널 (7일 전)
      const firstJournal = journals[0]
      expect(firstJournal.scores.guilt).toBe(8)

      // 마지막 저널 (어제)
      const lastJournal = journals[journals.length - 1]
      expect(lastJournal.scores.guilt).toBe(4)

      // 하락폭 확인
      expect(firstJournal.scores.guilt - lastJournal.scores.guilt).toBeGreaterThanOrEqual(2)
    })

    it('따뜻함이 첫 저널(3) 대비 마지막(6)에서 상승해야 한다', () => {
      const seed = generateSeedData()
      const journals = seed.journals

      const firstJournal = journals[0]
      expect(firstJournal.scores.warmth).toBe(3)

      const lastJournal = journals[journals.length - 1]
      expect(lastJournal.scores.warmth).toBe(6)

      expect(lastJournal.scores.warmth).toBeGreaterThan(firstJournal.scores.warmth)
    })
  })
})
