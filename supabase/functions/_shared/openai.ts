/**
 * 온곁 리멤버 - OpenAI API 래퍼
 *
 * fetch 기반 얇은 래퍼, 모델명은 환경변수 사용
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * OpenAI API 응답 타입
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: ChatMessage
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_tokens_details?: {
      cached_tokens?: number
    }
  }
}

export interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string
    }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_tokens_details?: {
      cached_tokens?: number
    }
  }
}

/**
 * AI 사용량 기록 파라미터
 */
export interface UsageLogParams {
  userId?: string
  purpose: 'chat' | 'risk' | 'journal' | 'eval'
  model: string
  inputTokens: number
  cachedTokens: number
  outputTokens: number
}

/**
 * AI 사용량을 ai_usage 테이블에 기록합니다.
 */
export async function logUsage(params: UsageLogParams): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[openai] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { error } = await supabase.from('ai_usage').insert({
    user_id: params.userId || null,
    purpose: params.purpose,
    model: params.model,
    input_tokens: params.inputTokens,
    cached_tokens: params.cachedTokens,
    output_tokens: params.outputTokens,
  })

  if (error) {
    console.error('[openai] AI 사용량 기록 실패:', error)
  }
}

/**
 * OpenAI API 호출 옵션
 */
export interface OpenAICallOptions {
  model?: string // 지정하지 않으면 환경변수에서 가져옴
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  responseFormat?: { type: 'json_schema'; json_schema: unknown }
  stream?: boolean
}

/**
 * 일반 OpenAI Chat Completion 호출
 */
export async function callOpenAI(
  options: OpenAICallOptions
): Promise<ChatCompletionResponse> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다')
  }

  const model = options.model || Deno.env.get('OPENAI_MODEL_CHAT') || 'gpt-4o-mini'

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
  }

  if (options.maxTokens) {
    body.max_tokens = options.maxTokens
  }

  if (options.temperature !== undefined) {
    body.temperature = options.temperature
  }

  if (options.responseFormat) {
    body.response_format = options.responseFormat
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API 오류 (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as ChatCompletionResponse
  return data
}

/**
 * 스트리밍 OpenAI Chat Completion 호출
 *
 * @returns ReadableStream of text chunks
 */
export async function callOpenAIStream(
  options: OpenAICallOptions
): Promise<ReadableStream<string>> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다')
  }

  const model = options.model || Deno.env.get('OPENAI_MODEL_CHAT') || 'gpt-4o-mini'

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    stream: true,
  }

  if (options.maxTokens) {
    body.max_tokens = options.maxTokens
  }

  if (options.temperature !== undefined) {
    body.temperature = options.temperature
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API 오류 (${response.status}): ${errorText}`)
  }

  if (!response.body) {
    throw new Error('응답 body가 없습니다')
  }

  // SSE 스트림을 텍스트 스트림으로 변환
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream<string>({
    async start(controller) {
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)

              if (data === '[DONE]') {
                continue
              }

              try {
                const chunk = JSON.parse(data) as StreamChunk
                const content = chunk.choices[0]?.delta?.content

                if (content) {
                  controller.enqueue(content)
                }

                // usage가 있으면 마지막 청크
                if (chunk.usage) {
                  // 스트리밍에서는 usage를 반환하지 않으므로 여기서 기록
                  // (호출자가 userId와 purpose를 전달해야 함 - 별도 처리 필요)
                }
              } catch (e) {
                console.error('[openai] 스트림 청크 파싱 실패:', e)
              }
            }
          }
        }

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

/**
 * JSON Schema로 제약된 응답을 요청합니다.
 *
 * @param schema - OpenAI Structured Outputs JSON Schema
 */
export async function callOpenAIWithSchema<T>(
  options: Omit<OpenAICallOptions, 'responseFormat'> & {
    schema: {
      name: string
      strict: boolean
      schema: Record<string, unknown>
    }
  }
): Promise<T> {
  const response = await callOpenAI({
    ...options,
    responseFormat: {
      type: 'json_schema',
      json_schema: options.schema,
    },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI 응답에 내용이 없습니다')
  }

  return JSON.parse(content) as T
}
