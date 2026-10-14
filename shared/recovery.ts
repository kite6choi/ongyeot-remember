/**
 * 온곁 리멤버 - 회복 규칙
 *
 * 저널 데이터를 분석하여 회복 문구 카드를 생성합니다.
 * plan.md 8-6 기준, AI 미사용
 */

import { Journal } from './journal'

/**
 * 회복 카드 타입
 */
export type RecoveryCardType = 'counselor' | 'warmth_up' | 'guilt_down' | 'need_more'

/**
 * 회복 카드
 */
export interface RecoveryCard {
  type: RecoveryCardType
  message: string
  priority: number  // 낮을수록 우선순위 높음
}

/**
 * 저널 데이터에서 회복 문구 카드를 생성합니다.
 *
 * @param journals 저널 배열 (날짜 역순 정렬 권장)
 * @param petName 반려동물 이름
 * @returns 회복 카드 배열 (우선순위 순으로 정렬됨)
 */
export function buildRecoveryCards(journals: Journal[], petName: string): RecoveryCard[] {
  const cards: RecoveryCard[] = []

  // 저널이 3개 미만이면 안내 카드만 반환
  if (journals.length < 3) {
    cards.push({
      type: 'need_more',
      message: '기록이 쌓이면 마음의 흐름을 보여드릴게요',
      priority: 100,
    })
    return cards
  }

  // 1. 무기력 ≥ 7이 3일 연속 → 상담사 연결 제안 (최우선)
  if (checkHighLethargyStreak(journals)) {
    cards.push({
      type: 'counselor',
      message: '며칠 동안 많이 힘드셨던 것 같아요. 전문 상담사와 이야기 나누시면 도움이 될 수 있어요.',
      priority: 1,
    })
  }

  // 2. 최근 7일 따뜻함 평균이 이전 7일보다 1 이상 상승
  const warmthMessage = checkWarmthIncrease(journals, petName)
  if (warmthMessage) {
    cards.push({
      type: 'warmth_up',
      message: warmthMessage,
      priority: 2,
    })
  }

  // 3. 죄책감이 첫 저널 대비 2 이상 하락
  if (checkGuiltDecrease(journals)) {
    cards.push({
      type: 'guilt_down',
      message: '처음보다 마음의 짐이 조금 가벼워졌어요',
      priority: 3,
    })
  }

  // 우선순위 순으로 정렬
  return cards.sort((a, b) => a.priority - b.priority)
}

/**
 * 무기력 점수가 7 이상인 날이 3일 연속인지 확인합니다.
 */
function checkHighLethargyStreak(journals: Journal[]): boolean {
  if (journals.length < 3) {
    return false
  }

  // 최근 3일 확인 (날짜 역순 정렬 가정)
  const recent3 = journals.slice(0, 3)

  return recent3.every(j => j.scores.lethargy >= 7)
}

/**
 * 최근 7일 따뜻함 평균이 이전 7일보다 1 이상 상승했는지 확인합니다.
 * 상승했다면 따뜻함 ≥ 5인 날 수를 포함한 메시지를 반환합니다.
 */
function checkWarmthIncrease(journals: Journal[], petName: string): string | null {
  if (journals.length < 7) {
    return null
  }

  const recent7 = journals.slice(0, 7)
  const recentAvg = average(recent7.map(j => j.scores.warmth))

  // 이전 7일이 있는 경우에만 비교
  if (journals.length >= 14) {
    const previous7 = journals.slice(7, 14)
    const previousAvg = average(previous7.map(j => j.scores.warmth))

    if (recentAvg - previousAvg >= 1) {
      const warmDays = recent7.filter(j => j.scores.warmth >= 5).length
      return `이번 주는 ${petName}를 웃으며 떠올린 날이 ${warmDays}일 있었어요`
    }
  }

  return null
}

/**
 * 죄책감이 첫 저널 대비 2 이상 하락했는지 확인합니다.
 */
function checkGuiltDecrease(journals: Journal[]): boolean {
  if (journals.length < 2) {
    return false
  }

  // 첫 저널 = 가장 오래된 저널 (배열 마지막)
  const firstJournal = journals[journals.length - 1]
  // 최근 저널 = 배열 첫 번째
  const recentJournal = journals[0]

  return firstJournal.scores.guilt - recentJournal.scores.guilt >= 2
}

/**
 * 평균 계산 헬퍼
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) {
    return 0
  }
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}
