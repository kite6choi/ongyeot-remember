/**
 * trial-seed Edge Function - Deno 테스트
 */

import { assertEquals, assertExists } from 'jsr:@std/assert@^1'
import { generateSeedData, calculateDaysSince } from '../_shared/seed.ts'

Deno.test('generateSeedData - 기본 구조 확인', () => {
  const seed = generateSeedData()

  assertEquals(seed.pet.name, '콩이')
  assertEquals(seed.pet.species, '몰티즈')
  assertEquals(seed.pet.age_years, 14)
  assertExists(seed.pet.passed_on)

  assertEquals(seed.memories.length, 3)
  assertEquals(seed.journals.length, 7)
})

Deno.test('generateSeedData - 상대 날짜 계산 (15일 전)', () => {
  const baseDate = new Date('2026-10-14')
  const seed = generateSeedData(baseDate)

  const daysSince = calculateDaysSince(seed.pet.passed_on, baseDate)
  assertEquals(daysSince, 15)
})

Deno.test('generateSeedData - 저널 점수 범위 검증', () => {
  const seed = generateSeedData()

  for (const journal of seed.journals) {
    // 0~10 범위 확인
    assertEquals(journal.scores.longing >= 0 && journal.scores.longing <= 10, true)
    assertEquals(journal.scores.guilt >= 0 && journal.scores.guilt <= 10, true)
    assertEquals(journal.scores.lethargy >= 0 && journal.scores.lethargy <= 10, true)
    assertEquals(journal.scores.warmth >= 0 && journal.scores.warmth <= 10, true)

    // 필수 필드 확인
    assertExists(journal.headline)
    assertExists(journal.moments)
    assertExists(journal.self_message)
    assertEquals(journal.moments.length > 0, true)
  }
})

Deno.test('generateSeedData - 감정 패턴 검증 (죄책감 하락, 따뜻함 상승)', () => {
  const seed = generateSeedData()

  // 첫 저널 (7일 전)
  const firstJournal = seed.journals[0]
  assertEquals(firstJournal.scores.guilt, 8)
  assertEquals(firstJournal.scores.warmth, 3)

  // 마지막 저널 (어제)
  const lastJournal = seed.journals[seed.journals.length - 1]
  assertEquals(lastJournal.scores.guilt, 4)
  assertEquals(lastJournal.scores.warmth, 6)

  // 죄책감 하락, 따뜻함 상승 확인
  assertEquals(lastJournal.scores.guilt < firstJournal.scores.guilt, true)
  assertEquals(lastJournal.scores.warmth > firstJournal.scores.warmth, true)
})

Deno.test('calculateDaysSince - 날짜 차이 계산', () => {
  const passedOn = '2026-09-29'
  const baseDate = new Date('2026-10-14')

  const days = calculateDaysSince(passedOn, baseDate)
  assertEquals(days, 15)
})
