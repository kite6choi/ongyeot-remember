/**
 * journal Edge Function - Deno 테스트
 */

import { assertEquals, assertExists } from 'jsr:@std/assert@^1'
import { validateJournal } from '../_shared/journal.ts'

Deno.test('validateJournal - 정상 JSON 통과', () => {
  const validJournal = {
    headline: '콩이가 그리운 하루',
    scores: {
      longing: 8,
      guilt: 5,
      lethargy: 4,
      warmth: 3,
    },
    moments: ['산책하던 공원을 지나갔어요', '콩이 사진을 보며 웃었어요'],
    self_message: '천천히 나아가고 있어',
    small_step: '콩이 앨범 정리하기',
  }

  const result = validateJournal(validJournal)

  assertEquals(result.ok, true)
  assertExists(result.journal)
  assertEquals(result.journal?.headline, '콩이가 그리운 하루')
  assertEquals(result.journal?.scores.longing, 8)
})

Deno.test('validateJournal - headline 30자 초과 시 자르기', () => {
  const longHeadline = {
    headline: '이것은 매우 긴 제목인데 30자를 초과하면 잘려야 합니다 정말로 길어요',
    scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
    moments: ['순간1'],
    self_message: '메시지',
    small_step: '작은 걸음',
  }

  const result = validateJournal(longHeadline)

  assertEquals(result.ok, true)
  assertEquals(result.journal?.headline.length, 30)
})

Deno.test('validateJournal - 점수 범위 보정 (0~10)', () => {
  const outOfRange = {
    headline: '테스트',
    scores: {
      longing: 15,      // 10으로 보정
      guilt: -5,        // 0으로 보정
      lethargy: 7.8,    // 8로 반올림
      warmth: 3.2,      // 3으로 반올림
    },
    moments: ['순간'],
    self_message: '메시지',
    small_step: '걸음',
  }

  const result = validateJournal(outOfRange)

  assertEquals(result.ok, true)
  assertEquals(result.journal?.scores.longing, 10)
  assertEquals(result.journal?.scores.guilt, 0)
  assertEquals(result.journal?.scores.lethargy, 8)
  assertEquals(result.journal?.scores.warmth, 3)
})

Deno.test('validateJournal - moments 최대 3개로 제한', () => {
  const manyMoments = {
    headline: '테스트',
    scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
    moments: ['순간1', '순간2', '순간3', '순간4', '순간5'],
    self_message: '메시지',
    small_step: '걸음',
  }

  const result = validateJournal(manyMoments)

  assertEquals(result.ok, true)
  assertEquals(result.journal?.moments.length, 3)
})

Deno.test('validateJournal - 필수 필드 누락 시 오류', () => {
  const missing = {
    headline: '테스트',
    scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
    // moments 누락
    self_message: '메시지',
    small_step: '걸음',
  }

  const result = validateJournal(missing)

  assertEquals(result.ok, false)
  assertExists(result.errors)
  assertEquals(result.errors?.some(e => e.includes('moments')), true)
})

Deno.test('validateJournal - 금지 표현 감지', () => {
  const forbidden = {
    headline: '테스트',
    scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
    moments: ['새로 입양하세요'],  // 금지 표현
    self_message: '메시지',
    small_step: '걸음',
  }

  const result = validateJournal(forbidden)

  assertEquals(result.ok, false)
  assertExists(result.errors)
  assertEquals(result.errors?.some(e => e.includes('금지 표현')), true)
})

Deno.test('validateJournal - JSON 문자열 파싱', () => {
  const jsonString = JSON.stringify({
    headline: '테스트',
    scores: { longing: 5, guilt: 5, lethargy: 5, warmth: 5 },
    moments: ['순간'],
    self_message: '메시지',
    small_step: '걸음',
  })

  const result = validateJournal(jsonString)

  assertEquals(result.ok, true)
  assertExists(result.journal)
})

Deno.test('validateJournal - 잘못된 JSON 문자열', () => {
  const invalidJson = '{ invalid json }'

  const result = validateJournal(invalidJson)

  assertEquals(result.ok, false)
  assertExists(result.errors)
  assertEquals(result.errors?.some(e => e.includes('JSON 파싱')), true)
})

Deno.test('buildJournalPrompt - 반려동물 이름과 일수 포함', async () => {
  const { buildJournalPrompt } = await import('../_shared/prompts.ts')

  const prompt = buildJournalPrompt('콩이', 15)

  assertEquals(prompt.includes('콩이'), true)
  assertEquals(prompt.includes('15일째'), true)
  assertEquals(prompt.includes('longing'), true)
  assertEquals(prompt.includes('guilt'), true)
})
