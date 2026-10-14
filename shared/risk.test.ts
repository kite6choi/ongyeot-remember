/**
 * 온곁 리멤버 - 위기 키워드 규칙 테스트
 *
 * AC-05-1, AC-05-2 검증
 */

import { describe, it, expect } from 'vitest'
import { checkRiskKeywords } from './risk'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ESM 환경에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 테스트 케이스 파일 읽기
const riskPositivePath = join(__dirname, '../harness/cases/risk_positive.json')
const riskNegativePath = join(__dirname, '../harness/cases/risk_negative.json')

const riskPositiveCases = JSON.parse(readFileSync(riskPositivePath, 'utf-8'))
const riskNegativeCases = JSON.parse(readFileSync(riskNegativePath, 'utf-8'))

describe('위기 키워드 규칙 (checkRiskKeywords)', () => {
  describe('양성 케이스 (위기 표현)', () => {
    it('expect_keyword: true인 케이스를 100% 감지해야 한다', () => {
      const keywordCases = riskPositiveCases.filter(
        (c: any) => c.expect_keyword === true
      )

      expect(keywordCases.length).toBeGreaterThan(0)

      let detectedCount = 0
      const failures: string[] = []

      for (const testCase of keywordCases) {
        const result = checkRiskKeywords(testCase.text)

        if (result === 'none') {
          failures.push(
            `[${testCase.id}] "${testCase.text}" → ${result} (기대: ${testCase.expect_level})`
          )
        } else {
          detectedCount++
        }
      }

      if (failures.length > 0) {
        console.error('감지 실패 케이스:')
        failures.forEach(f => console.error('  ', f))
      }

      expect(detectedCount).toBe(keywordCases.length)
    })

    it('각 케이스의 expect_level과 일치하거나 더 높아야 한다', () => {
      const levelOrder = { none: 0, medium: 1, high: 2 }
      const failures: string[] = []

      for (const testCase of riskPositiveCases) {
        const result = checkRiskKeywords(testCase.text)
        const expectedLevel = testCase.expect_level
        const resultValue = levelOrder[result as keyof typeof levelOrder]
        const expectedValue = levelOrder[expectedLevel as keyof typeof levelOrder]

        if (resultValue < expectedValue) {
          failures.push(
            `[${testCase.id}] "${testCase.text}" → ${result} (기대: ${expectedLevel})`
          )
        }
      }

      if (failures.length > 0) {
        console.error('등급 불일치:')
        failures.forEach(f => console.error('  ', f))
      }

      expect(failures).toHaveLength(0)
    })
  })

  describe('음성 케이스 (일반 슬픔·관용 표현)', () => {
    it('high 판정이 0건이어야 한다 (AC-05-2)', () => {
      const highResults: string[] = []

      for (const testCase of riskNegativeCases) {
        const result = checkRiskKeywords(testCase.text)

        if (result === 'high') {
          highResults.push(
            `[${testCase.id}] "${testCase.text}" → ${result} (오탐!)`
          )
        }
      }

      if (highResults.length > 0) {
        console.error('오탐 (high 판정):')
        highResults.forEach(r => console.error('  ', r))
      }

      expect(highResults).toHaveLength(0)
    })

    it('대부분 none 또는 medium 이하여야 한다', () => {
      for (const testCase of riskNegativeCases) {
        const result = checkRiskKeywords(testCase.text)
        const expectedLevel = testCase.expect_level || 'none'

        expect(result).toBe(expectedLevel)
      }
    })
  })

  describe('엣지 케이스', () => {
    it('빈 문자열은 none을 반환해야 한다', () => {
      expect(checkRiskKeywords('')).toBe('none')
      expect(checkRiskKeywords('   ')).toBe('none')
    })

    it('띄어쓰기 변형도 감지해야 한다', () => {
      // 공백 있음
      expect(checkRiskKeywords('죽고 싶어요')).toBe('high')
      // 공백 없음
      expect(checkRiskKeywords('죽고싶어요')).toBe('high')
      // 공백 여러 개
      expect(checkRiskKeywords('죽고    싶어요')).toBe('high')
    })

    it('관용 표현은 high가 아니어야 한다', () => {
      expect(checkRiskKeywords('보고 싶어 죽겠어요')).not.toBe('high')
      expect(checkRiskKeywords('귀여워 죽겠어요')).not.toBe('high')
      expect(checkRiskKeywords('웃겨 죽겠어요')).not.toBe('high')
    })
  })
})
