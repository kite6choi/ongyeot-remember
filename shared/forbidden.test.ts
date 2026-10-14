/**
 * 온곁 리멤버 - 금지 표현 검사 테스트
 *
 * AC-03-2, AC-03-3 검증
 */

import { describe, it, expect } from 'vitest'
import { findForbidden, hasForbidden } from './forbidden'

describe('금지 표현 검사 (findForbidden)', () => {
  describe('금지 표현 감지', () => {
    it('입양 권유 표현을 감지해야 한다', () => {
      expect(findForbidden('새로 입양하시는 건 어떠세요?')).toContain('입양_권유')
      expect(findForbidden('다른 강아지를 키우시면 도움이 될 거예요')).toContain('입양_권유')
    })

    it('망각 권유 표현을 감지해야 한다', () => {
      expect(findForbidden('이제 잊고 앞으로 나아가세요')).toContain('망각_권유')
      expect(findForbidden('그만 슬퍼하셔야 해요')).toContain('망각_권유')
    })

    it('축소·비교 표현을 감지해야 한다', () => {
      expect(findForbidden('동물일 뿐이잖아요')).toContain('축소_비교')
      expect(findForbidden('그래도 사람이 아니니까요')).toContain('축소_비교')
    })

    it('반려동물 흉내 표현을 감지해야 한다', () => {
      expect(findForbidden('엄마, 나 여기 있어요')).toContain('반려동물_흉내')
      expect(findForbidden('아빠 나 괜찮아요')).toContain('반려동물_흉내')
    })

    it('진단·치료 표현을 감지해야 한다', () => {
      expect(findForbidden('우울증입니다')).toContain('진단_치료')
      expect(findForbidden('병원에서 진단을 받아보세요')).toContain('진단_치료')
    })

    it('영적 단정 표현을 감지해야 한다', () => {
      expect(findForbidden('무지개 다리 건너 행복하게 있을 거예요')).toContain('영적_단정')
      expect(findForbidden('무지개다리건너기다리고있어요')).toContain('영적_단정')
    })
  })

  describe('정상 공감 문장 (오탐 방지)', () => {
    const normalResponses = [
      '콩이를 떠나보낸 슬픔을 함께 나눠드릴게요',
      '그 마음이 너무 잘 이해가 돼요',
      '죄책감을 느끼시는 건 자연스러운 반응이에요',
      '콩이와 함께한 시간들이 소중했군요',
      '지금 느끼시는 감정을 천천히 정리해 나가시면 돼요',
      '많이 힘드시겠어요. 충분히 슬퍼하셔도 괜찮아요',
      '콩이가 얼마나 사랑받았는지 느껴져요',
      '작은 걸음으로 하루하루 나아가시면 돼요',
      '필요하시면 전문 상담사와 이야기 나누시는 것도 도움이 될 수 있어요',
      '혼자가 아니에요. 곁에서 함께할게요',
    ]

    it('정상 공감 문장에서 오탐이 없어야 한다 (AC-03-2)', () => {
      const falsPositives: string[] = []

      for (const response of normalResponses) {
        const found = findForbidden(response)
        if (found.length > 0) {
          falsPositives.push(`"${response}" → ${found.join(', ')}`)
        }
      }

      if (falsPositives.length > 0) {
        console.error('오탐 발견:')
        falsPositives.forEach(f => console.error('  ', f))
      }

      expect(falsPositives).toHaveLength(0)
    })
  })

  describe('hasForbidden 헬퍼', () => {
    it('금지 표현이 있으면 true를 반환한다', () => {
      expect(hasForbidden('새로 입양하세요')).toBe(true)
      expect(hasForbidden('이제 잊으세요')).toBe(true)
    })

    it('금지 표현이 없으면 false를 반환한다', () => {
      expect(hasForbidden('콩이를 떠나보낸 슬픔이 느껴져요')).toBe(false)
      expect(hasForbidden('충분히 슬퍼하셔도 괜찮아요')).toBe(false)
    })
  })

  describe('엣지 케이스', () => {
    it('빈 문자열은 빈 배열을 반환한다', () => {
      expect(findForbidden('')).toEqual([])
      expect(findForbidden('   ')).toEqual([])
    })

    it('여러 금지 표현이 있으면 모두 감지한다', () => {
      const text = '이제 잊고 새로 입양하세요'
      const found = findForbidden(text)
      expect(found).toContain('망각_권유')
      expect(found).toContain('입양_권유')
      expect(found.length).toBe(2)
    })

    it('띄어쓰기 변형도 감지한다', () => {
      expect(findForbidden('새로입양하세요')).toContain('입양_권유')
      expect(findForbidden('이제잊으세요')).toContain('망각_권유')
    })
  })
})
