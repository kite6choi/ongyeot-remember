/**
 * 온곁 리멤버 - 위기 키워드 규칙
 *
 * 사용자 메시지에서 자살·자해 위험 표현을 감지합니다.
 * plan.md 8-4 기준
 */

export type RiskLevel = 'none' | 'medium' | 'high'

/**
 * 위기 키워드 규칙으로 텍스트를 검사합니다.
 *
 * @param text 검사할 텍스트
 * @returns 'high' (직접 표현), 'medium' (간접 표현), 'none' (위기 아님)
 */
export function checkRiskKeywords(text: string): RiskLevel {
  if (!text || text.trim().length === 0) {
    return 'none'
  }

  // 공백 제거 버전도 함께 검사 (띄어쓰기 변형 대응)
  const normalized = text.replace(/\s+/g, '')

  // 1. 관용 표현 예외 처리 (high에서 제외)
  const idiomPatterns = [
    /보고\s*싶어\s*죽겠/,
    /귀여워\s*죽겠/,
    /웃겨\s*죽겠/,
    /맛있어\s*죽겠/,
    /예뻐\s*죽겠/,
    /좋아\s*죽겠/,
  ]

  const hasIdiom = idiomPatterns.some(pattern =>
    pattern.test(text) || pattern.test(normalized)
  )

  // 2. HIGH: 자살·자해 의도나 방법을 직접 표현
  const highPatterns = [
    /죽고\s*싶/,
    /따라\s*가고\s*싶/,
    /사라지고\s*싶/,
    /살\s*이유가?\s*없/,
    /목숨을?\s*끊/,
    /자해/,
    /유서/,
    /자살/,
    /죽어\s*버리/,
    /죽을\s*거/,
  ]

  // 관용 표현이 아닌 경우에만 high 패턴 검사
  if (!hasIdiom) {
    for (const pattern of highPatterns) {
      if (pattern.test(text) || pattern.test(normalized)) {
        return 'high'
      }
    }
  }

  // 3. MEDIUM: 간접 표현
  const mediumPatterns = [
    /더\s*이상\s*못\s*버티/,
    /다\s*끝내고\s*싶/,
    /아무\s*의미\s*없/,
    /살기\s*힘들/,
    /포기하고\s*싶/,
    /지쳐\s*버렸/,
  ]

  for (const pattern of mediumPatterns) {
    if (pattern.test(text) || pattern.test(normalized)) {
      return 'medium'
    }
  }

  return 'none'
}
