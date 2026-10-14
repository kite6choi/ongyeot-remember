/**
 * 온곁 리멤버 - 저널 검증
 *
 * AI가 생성한 저널 JSON을 검증하고 정규화합니다.
 * plan.md 8-5 기준
 */

import { findForbidden } from './forbidden.ts'

/**
 * 감정 점수 (0~10)
 */
export interface EmotionScores {
  longing: number    // 그리움
  guilt: number      // 죄책감
  lethargy: number   // 무기력
  warmth: number     // 따뜻함
}

/**
 * 저널 구조
 */
export interface Journal {
  headline: string           // 오늘의 한 줄 (30자 이내)
  scores: EmotionScores      // 감정 점수
  moments: string[]          // 기억한 순간 (최대 3개)
  self_message: string       // 나에게 건네는 말
  small_step: string         // 내일의 작은 한 걸음
}

/**
 * 검증 결과
 */
export interface ValidationResult {
  ok: boolean
  journal?: Journal
  errors?: string[]
}

/**
 * 점수를 0~10 정수로 보정합니다.
 */
function normalizeScore(value: any): number {
  // 문자열이면 숫자로 변환 시도
  const num = typeof value === 'string' ? parseFloat(value) : value

  // 숫자가 아니면 0으로
  if (typeof num !== 'number' || isNaN(num)) {
    return 0
  }

  // 0~10 범위로 제한
  const clamped = Math.max(0, Math.min(10, num))

  // 정수로 반올림
  return Math.round(clamped)
}

/**
 * AI가 생성한 저널 JSON을 검증하고 정규화합니다.
 *
 * @param raw AI 응답 (JSON 파싱 전 또는 후)
 * @returns 검증 결과
 */
export function validateJournal(raw: any): ValidationResult {
  const errors: string[] = []

  // 1. JSON 파싱 (문자열인 경우)
  let data: any
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch (e) {
      return { ok: false, errors: ['JSON 파싱 실패'] }
    }
  } else {
    data = raw
  }

  // 2. 필수 필드 확인
  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['유효한 객체가 아닙니다'] }
  }

  const requiredFields = ['headline', 'scores', 'moments', 'self_message', 'small_step']
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`필수 필드 누락: ${field}`)
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  // 3. headline 검증 및 정규화
  let headline = String(data.headline || '')
  if (headline.length > 30) {
    headline = headline.slice(0, 30)
  }

  // 4. scores 검증 및 정규화
  const scores: EmotionScores = {
    longing: normalizeScore(data.scores?.longing),
    guilt: normalizeScore(data.scores?.guilt),
    lethargy: normalizeScore(data.scores?.lethargy),
    warmth: normalizeScore(data.scores?.warmth),
  }

  // 5. moments 검증 및 정규화
  let moments: string[] = []
  if (Array.isArray(data.moments)) {
    moments = data.moments
      .map((m: any) => String(m))
      .filter((m: string) => m.trim().length > 0)
      .slice(0, 3) // 최대 3개
  }

  // 6. self_message, small_step 검증
  const self_message = String(data.self_message || '')
  const small_step = String(data.small_step || '')

  // 7. 금지 표현 검사
  const allText = [headline, self_message, small_step, ...moments].join(' ')
  const forbidden = findForbidden(allText)

  if (forbidden.length > 0) {
    errors.push(`금지 표현 발견: ${forbidden.join(', ')}`)
  }

  // 8. 결과 반환
  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const journal: Journal = {
    headline,
    scores,
    moments,
    self_message,
    small_step,
  }

  return { ok: true, journal }
}
