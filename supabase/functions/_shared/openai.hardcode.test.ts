/**
 * OpenAI 모듈 - 모델명 하드코딩 검증 테스트
 *
 * 코드에 모델명이 하드코딩되지 않았는지 확인합니다.
 */

import { assertEquals } from 'jsr:@std/assert@^1'

Deno.test('모델명 하드코딩 없음 - openai.ts', async () => {
  const code = await Deno.readTextFile('./openai.ts')

  // 허용되는 패턴: 환경변수 기본값 (fallback)
  // 예: Deno.env.get('OPENAI_MODEL_CHAT') || 'gpt-4o-mini'

  // 하드코딩된 모델명 패턴 (환경변수나 fallback이 아닌 곳)
  const hardcodedPatterns = [
    // 직접 할당이나 비교 (환경변수 fallback 제외)
    /model\s*[:=]\s*['"]gpt-/i,
    /===\s*['"]gpt-/i,
    /==\s*['"]gpt-/i,
  ]

  const violations: string[] = []

  for (const pattern of hardcodedPatterns) {
    // 환경변수 기본값 라인은 제외
    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 환경변수 fallback 패턴은 허용
      if (line.includes('Deno.env.get') && line.includes('||')) {
        continue
      }

      if (pattern.test(line)) {
        violations.push(`Line ${i + 1}: ${line.trim()}`)
      }
    }
  }

  assertEquals(
    violations.length,
    0,
    `모델명이 하드코딩되었습니다:\n${violations.join('\n')}\n\n환경변수를 사용하세요: Deno.env.get('OPENAI_MODEL_CHAT') || 'gpt-4o-mini'`
  )
})

Deno.test('모델명 하드코딩 없음 - prompts.ts', async () => {
  const code = await Deno.readTextFile('./prompts.ts')

  // prompts.ts에는 모델명이 언급되면 안 됨 (프롬프트 내용 제외)
  const hardcodedPatterns = [
    /model\s*[:=]\s*['"]gpt-/i,
  ]

  const violations: string[] = []

  for (const pattern of hardcodedPatterns) {
    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (pattern.test(line)) {
        violations.push(`Line ${i + 1}: ${line.trim()}`)
      }
    }
  }

  assertEquals(
    violations.length,
    0,
    `prompts.ts에 모델명이 하드코딩되었습니다:\n${violations.join('\n')}`
  )
})
