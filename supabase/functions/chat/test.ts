/**
 * chat Edge Function - Deno 테스트
 */

import { assertEquals, assertExists } from 'jsr:@std/assert@^1'

// Mock Supabase 클라이언트
class MockSupabaseClient {
  private mockData: Record<string, unknown> = {}
  private insertCalls: Array<{ table: string; data: unknown }> = []

  setMockData(key: string, data: unknown) {
    this.mockData[key] = data
  }

  from(table: string) {
    return {
      select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => {
        if (options?.count === 'exact' && options?.head) {
          return {
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  count: this.mockData[`${table}_count`] as number || 0,
                  error: null,
                }),
              }),
            }),
          }
        }

        return {
          eq: () => ({
            single: () => ({
              data: this.mockData[`${table}_single`],
              error: null,
            }),
            limit: () => ({
              data: this.mockData[`${table}_list`],
              error: null,
            }),
            order: () => ({
              limit: () => ({
                data: this.mockData[`${table}_list`],
                error: null,
              }),
            }),
          }),
          gte: () => ({
            data: this.mockData[`${table}_usage`],
            error: null,
          }),
          order: () => ({
            limit: () => ({
              data: this.mockData[`${table}_messages`] || [],
              error: null,
            }),
          }),
        }
      },
      insert: (data: unknown) => {
        this.insertCalls.push({ table, data })
        return {
          data: null,
          error: null,
        }
      },
    }
  }

  auth = {
    getUser: () => ({
      data: { user: { id: 'test-user-id' } },
      error: null,
    }),
  }

  getInsertCalls() {
    return this.insertCalls
  }

  resetInsertCalls() {
    this.insertCalls = []
  }
}

Deno.test('키워드 위기 감지 → crisis 응답, OpenAI 호출 0회', async () => {
  // 이 테스트는 통합 테스트에서 수행
  // 여기서는 checkRiskKeywords 함수만 단위 테스트
  const { checkRiskKeywords } = await import('../_shared/risk.ts')

  const highMessage = '죽고 싶어요'
  const result = checkRiskKeywords(highMessage)

  assertEquals(result, 'high')
})

Deno.test('관용 표현은 위기 아님', async () => {
  const { checkRiskKeywords } = await import('../_shared/risk.ts')

  const idiomMessage = '콩이가 보고 싶어 죽겠어요'
  const result = checkRiskKeywords(idiomMessage)

  assertEquals(result, 'none')
})

Deno.test('간접 위기 표현 → medium', async () => {
  const { checkRiskKeywords } = await import('../_shared/risk.ts')

  const mediumMessage = '더 이상 못 버티겠어요'
  const result = checkRiskKeywords(mediumMessage)

  assertEquals(result, 'medium')
})

Deno.test('정상 메시지 → none', async () => {
  const { checkRiskKeywords } = await import('../_shared/risk.ts')

  const normalMessage = '콩이 생각에 슬퍼요'
  const result = checkRiskKeywords(normalMessage)

  assertEquals(result, 'none')
})

Deno.test('buildChatSystemPrompt - 컨텍스트 포함', async () => {
  const { buildChatSystemPrompt } = await import('../_shared/prompts.ts')

  const petContext = '반려동물: 콩이 (몰티즈, 14세)\n떠나보낸 지: 15일째'
  const recentJournals = '최근 감정: 슬픔 8, 죄책감 6'

  const prompt = buildChatSystemPrompt(petContext, recentJournals)

  // 프롬프트에 컨텍스트가 포함되어 있는지 확인
  assertEquals(prompt.includes('콩이'), true)
  assertEquals(prompt.includes('15일째'), true)
  assertEquals(prompt.includes('슬픔 8'), true)
})

Deno.test('buildJournalPrompt - 반려동물 이름과 일수 포함', async () => {
  const { buildJournalPrompt } = await import('../_shared/prompts.ts')

  const prompt = buildJournalPrompt('콩이', 15)

  assertEquals(prompt.includes('콩이'), true)
  assertEquals(prompt.includes('15일째'), true)
})
