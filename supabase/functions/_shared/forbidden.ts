/**
 * 온곁 리멤버 - 금지 표현 검사
 *
 * AI 응답에서 사용하면 안 되는 표현들을 감지합니다.
 * plan.md 8-3 기준
 */

/**
 * 금지 표현 분류와 패턴
 */
const FORBIDDEN_PATTERNS = {
  입양_권유: [
    /새로\s*입양/,
    /다른\s*(강아지|고양이|아이)를?\s*(키우|데려)/,
  ],
  망각_권유: [
    /이제\s*잊/,
    /그만\s*슬퍼/,
    /털어\s*버리/,
  ],
  축소_비교: [
    /동물일\s*뿐/,
    /그래도\s*사람이\s*아니/,
    /더\s*힘든\s*사람/,
  ],
  반려동물_흉내: [
    /(엄마|아빠|언니|누나|형|오빠),?\s*나\s*(여기|괜찮)/,
  ],
  진단_치료: [
    /우울증(입니다|이에요)/,
    /진단/,
    /처방/,
    /약을\s*(드|복용)/,
  ],
  영적_단정: [
    /무지개\s*다리\s*건너.*(행복하게|기다리고)\s*있/,
  ],
} as const

/**
 * 텍스트에서 금지 표현을 찾습니다.
 *
 * @param text 검사할 텍스트 (AI 응답)
 * @returns 발견된 금지 표현 배열 (분류명)
 */
export function findForbidden(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const found: string[] = []

  // 각 분류별로 패턴 검사
  for (const [category, patterns] of Object.entries(FORBIDDEN_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        found.push(category)
        break // 같은 분류는 한 번만 추가
      }
    }
  }

  return found
}

/**
 * 금지 표현이 있는지 확인합니다.
 *
 * @param text 검사할 텍스트
 * @returns 금지 표현이 있으면 true
 */
export function hasForbidden(text: string): boolean {
  return findForbidden(text).length > 0
}
