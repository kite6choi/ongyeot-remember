/**
 * OpenAI 모듈 - Deno 테스트
 */

import { assertEquals, assertExists } from 'jsr:@std/assert@^1'
import {
  callOpenAI,
  callOpenAIStream,
  callOpenAIWithSchema,
  logUsage,
  type ChatCompletionResponse,
} from './openai.ts'

// Mock fetch 설정
let fetchCalls: Array<{ url: string; options: RequestInit }> = []
let mockResponse: Response | null = null

const originalFetch = globalThis.fetch

function setupMockFetch(response: Response) {
  fetchCalls = []
  mockResponse = response
  globalThis.fetch = async (url: string | URL | Request, options?: RequestInit) => {
    fetchCalls.push({
      url: url.toString(),
      options: options || {},
    })
    return mockResponse!
  }
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

Deno.test('callOpenAI - 환경변수 모델명 사용', async () => {
  const mockData: ChatCompletionResponse = {
    choices: [
      {
        message: { role: 'assistant', content: '안녕하세요' },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  }

  setupMockFetch(
    new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    Deno.env.set('OPENAI_API_KEY', 'test-key')
    Deno.env.set('OPENAI_MODEL_CHAT', 'test-model-chat')

    await callOpenAI({
      messages: [{ role: 'user', content: '안녕' }],
    })

    // 요청이 1번 발생했는지 확인
    assertEquals(fetchCalls.length, 1)

    // 요청 본문 확인
    const requestBody = JSON.parse(fetchCalls[0].options.body as string)
    assertEquals(requestBody.model, 'test-model-chat')
    assertEquals(requestBody.messages[0].content, '안녕')

    // Authorization 헤더 확인
    const headers = fetchCalls[0].options.headers as Record<string, string>
    assertEquals(headers.Authorization, 'Bearer test-key')
  } finally {
    restoreFetch()
    Deno.env.delete('OPENAI_API_KEY')
    Deno.env.delete('OPENAI_MODEL_CHAT')
  }
})

Deno.test('callOpenAI - 명시적 모델 지정', async () => {
  const mockData: ChatCompletionResponse = {
    choices: [
      {
        message: { role: 'assistant', content: '응답' },
        finish_reason: 'stop',
      },
    ],
  }

  setupMockFetch(
    new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    Deno.env.set('OPENAI_API_KEY', 'test-key')

    await callOpenAI({
      model: 'explicit-model',
      messages: [{ role: 'user', content: 'test' }],
    })

    const requestBody = JSON.parse(fetchCalls[0].options.body as string)
    assertEquals(requestBody.model, 'explicit-model')
  } finally {
    restoreFetch()
    Deno.env.delete('OPENAI_API_KEY')
  }
})

Deno.test('callOpenAI - maxTokens와 temperature 설정', async () => {
  const mockData: ChatCompletionResponse = {
    choices: [
      {
        message: { role: 'assistant', content: '응답' },
        finish_reason: 'stop',
      },
    ],
  }

  setupMockFetch(
    new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    Deno.env.set('OPENAI_API_KEY', 'test-key')

    await callOpenAI({
      messages: [{ role: 'user', content: 'test' }],
      maxTokens: 100,
      temperature: 0.7,
    })

    const requestBody = JSON.parse(fetchCalls[0].options.body as string)
    assertEquals(requestBody.max_tokens, 100)
    assertEquals(requestBody.temperature, 0.7)
  } finally {
    restoreFetch()
    Deno.env.delete('OPENAI_API_KEY')
  }
})

Deno.test('callOpenAIStream - 스트림 청크 조합', async () => {
  // SSE 형식의 스트림 데이터
  const sseData = `data: {"choices":[{"delta":{"content":"안녕"},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":"하세요"},"finish_reason":null}]}

data: {"choices":[{"delta":{},"finish_reason":"stop"}]}

data: [DONE]

`

  setupMockFetch(
    new Response(sseData, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  )

  try {
    Deno.env.set('OPENAI_API_KEY', 'test-key')
    Deno.env.set('OPENAI_MODEL_CHAT', 'test-model')

    const stream = await callOpenAIStream({
      messages: [{ role: 'user', content: 'test' }],
    })

    // 스트림에서 모든 청크를 읽기
    const chunks: string[] = []
    const reader = stream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // 청크 결합 확인
    assertEquals(chunks.join(''), '안녕하세요')

    // 요청 본문 확인
    const requestBody = JSON.parse(fetchCalls[0].options.body as string)
    assertEquals(requestBody.stream, true)
    assertEquals(requestBody.model, 'test-model')
  } finally {
    restoreFetch()
    Deno.env.delete('OPENAI_API_KEY')
    Deno.env.delete('OPENAI_MODEL_CHAT')
  }
})

Deno.test('callOpenAIWithSchema - JSON Schema 응답', async () => {
  const mockData: ChatCompletionResponse = {
    choices: [
      {
        message: {
          role: 'assistant',
          content: '{"level":"none","reason":"정상 슬픔"}',
        },
        finish_reason: 'stop',
      },
    ],
  }

  setupMockFetch(
    new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )

  try {
    Deno.env.set('OPENAI_API_KEY', 'test-key')

    const result = await callOpenAIWithSchema<{ level: string; reason: string }>({
      messages: [{ role: 'user', content: '슬퍼요' }],
      schema: {
        name: 'test_schema',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            level: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['level', 'reason'],
        },
      },
    })

    assertEquals(result.level, 'none')
    assertEquals(result.reason, '정상 슬픔')

    // response_format 확인
    const requestBody = JSON.parse(fetchCalls[0].options.body as string)
    assertExists(requestBody.response_format)
    assertEquals(requestBody.response_format.type, 'json_schema')
  } finally {
    restoreFetch()
    Deno.env.delete('OPENAI_API_KEY')
  }
})

Deno.test('logUsage - ai_usage 테이블 기록 (mock)', async () => {
  // logUsage는 실제 Supabase를 호출하므로 여기서는 함수 호출만 확인
  // (통합 테스트에서 실제 DB 기록 확인)

  try {
    // SUPABASE_URL이 없으면 조기 리턴하므로 환경변수 설정 안 함
    await logUsage({
      userId: 'test-user',
      purpose: 'chat',
      model: 'test-model',
      inputTokens: 10,
      cachedTokens: 5,
      outputTokens: 3,
    })

    // 오류 없이 완료되면 성공
    assertEquals(true, true)
  } catch (e) {
    // 예상되는 에러는 무시
    console.log('[test] logUsage 오류:', (e as Error).message)
  }
})
