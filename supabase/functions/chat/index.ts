/**
 * 온곁 리멤버 - 대화 Edge Function
 *
 * plan.md 7장, tasks.md T10 기준
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkRiskKeywords } from '../_shared/risk.ts'
import { callOpenAIWithSchema, callOpenAIStream, logUsage } from '../_shared/openai.ts'
import {
  buildChatSystemPrompt,
  RISK_CLASSIFICATION_PROMPT,
  RISK_CLASSIFICATION_SCHEMA,
} from '../_shared/prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  conversationId: string
  message: string
}

interface ChatResponse {
  type: 'stream' | 'crisis' | 'limit'
  scope?: 'user' | 'global'
  conversationId?: string
}

/**
 * 사용량 상한 확인
 */
async function checkUsageLimits(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ allowed: boolean; scope?: 'user' | 'global' }> {
  const today = new Date().toISOString().split('T')[0]

  // 1. 사용자 일일 턴 수 확인
  const dailyTurnLimit = parseInt(Deno.env.get('TRIAL_DAILY_TURN_LIMIT') || '30', 10)

  const { count: userTurnCount, error: turnError } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('purpose', 'chat')
    .gte('created_at', `${today}T00:00:00Z`)

  if (turnError) {
    console.error('[chat] 사용자 턴 수 조회 실패:', turnError)
  }

  if (userTurnCount !== null && userTurnCount >= dailyTurnLimit) {
    return { allowed: false, scope: 'user' }
  }

  // 2. 전체 일일 비용 확인
  const globalDailyLimit = parseFloat(Deno.env.get('GLOBAL_DAILY_USD_LIMIT') || '3')

  const { data: usageData, error: usageError } = await supabase
    .from('ai_usage')
    .select('model, input_tokens, output_tokens')
    .gte('created_at', `${today}T00:00:00Z`)

  if (usageError) {
    console.error('[chat] 전체 사용량 조회 실패:', usageError)
  }

  if (usageData) {
    // 간단한 비용 추정 (실제로는 모델별 가격 적용 필요)
    // gpt-4o-mini: $0.150 / 1M input, $0.600 / 1M output
    const estimatedCost = usageData.reduce((sum, record) => {
      const inputCost = (record.input_tokens / 1_000_000) * 0.15
      const outputCost = (record.output_tokens / 1_000_000) * 0.6
      return sum + inputCost + outputCost
    }, 0)

    if (estimatedCost >= globalDailyLimit) {
      return { allowed: false, scope: 'global' }
    }
  }

  return { allowed: true }
}

/**
 * 위기 분류 (nano 모델, 타임아웃 적용)
 */
async function classifyRisk(
  userMessage: string,
  recentMessages: Array<{ role: string; content: string }>
): Promise<'none' | 'medium' | 'high'> {
  const timeoutMs = parseInt(Deno.env.get('RISK_CLASSIFY_TIMEOUT_MS') || '1500', 10)

  const messages = [
    { role: 'system' as const, content: RISK_CLASSIFICATION_PROMPT },
    ...recentMessages.slice(-2).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const model = Deno.env.get('OPENAI_MODEL_LIGHT') || 'gpt-4o-mini'

    const result = await Promise.race([
      callOpenAIWithSchema<{ level: 'none' | 'medium' | 'high'; reason: string }>({
        model,
        messages,
        maxTokens: 50,
        schema: RISK_CLASSIFICATION_SCHEMA,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('분류 타임아웃')), timeoutMs)
      ),
    ])

    clearTimeout(timeoutId)

    console.log(`[chat] 위기 분류 결과: ${result.level} (${result.reason})`)
    return result.level
  } catch (error) {
    console.error('[chat] 위기 분류 실패:', error)
    return 'none' // 타임아웃이나 오류 시 none 반환 (키워드 결과 사용)
  }
}

/**
 * 대화 컨텍스트 구성
 */
async function buildContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  conversationId: string
): Promise<{ petContext: string; recentJournals: string; recentMessages: Array<{ role: string; content: string }> }> {
  // 1. 반려동물 정보
  const { data: conversation } = await supabase
    .from('conversations')
    .select('pet_id')
    .eq('id', conversationId)
    .single()

  if (!conversation) {
    throw new Error('대화 세션을 찾을 수 없습니다')
  }

  const { data: pet } = await supabase
    .from('pets')
    .select('name, species, age_years, passed_on')
    .eq('id', conversation.pet_id)
    .single()

  if (!pet) {
    throw new Error('반려동물 정보를 찾을 수 없습니다')
  }

  // 떠난 지 N일째 계산
  const passedDate = new Date(pet.passed_on)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - passedDate.getTime()) / (1000 * 60 * 60 * 24))

  // 추억 조회
  const { data: memories } = await supabase
    .from('memories')
    .select('note')
    .eq('pet_id', conversation.pet_id)
    .limit(5)

  const memoriesText = memories && memories.length > 0
    ? memories.map(m => `- ${m.note}`).join('\n')
    : '(아직 등록된 추억이 없습니다)'

  const petContext = `반려동물: ${pet.name} (${pet.species}, ${pet.age_years}세)
떠나보낸 지: ${daysSince}일째

추억:
${memoriesText}`

  // 2. 최근 저널 3개
  const { data: journals } = await supabase
    .from('journals')
    .select('headline, longing, guilt, lethargy, warmth')
    .eq('user_id', userId)
    .order('journal_date', { ascending: false })
    .limit(3)

  const journalsText = journals && journals.length > 0
    ? journals.map(j => `- ${j.headline} (그리움 ${j.longing}, 죄책감 ${j.guilt}, 무기력 ${j.lethargy}, 따뜻함 ${j.warmth})`).join('\n')
    : '(아직 저널이 없습니다)'

  const recentJournals = `최근 감정 기록:\n${journalsText}`

  // 3. 최근 12턴 (메시지 24개)
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(24)

  const recentMessages = messages ? messages.reverse() : []

  return { petContext, recentJournals, recentMessages }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[chat] 함수 시작')

    // 1. JWT 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '인증이 필요합니다' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: '사용자 인증 실패' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[chat] 사용자: ${user.id}`)

    // 2. 요청 본문 파싱
    let body: ChatRequest
    try {
      const text = await req.text()
      body = JSON.parse(text) as ChatRequest
    } catch (e) {
      return new Response(
        JSON.stringify({ error: '잘못된 요청 형식입니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { conversationId, message } = body

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ error: 'conversationId와 message가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. 사용량 상한 확인
    console.log('[chat] 사용량 상한 확인')
    const usageCheck = await checkUsageLimits(supabaseClient, user.id)

    if (!usageCheck.allowed) {
      console.log(`[chat] 사용량 상한 초과: ${usageCheck.scope}`)
      return new Response(
        JSON.stringify({ type: 'limit', scope: usageCheck.scope } as ChatResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 위기 1차 검사 (키워드)
    console.log('[chat] 위기 키워드 검사')
    const keywordLevel = checkRiskKeywords(message)
    console.log(`[chat] 키워드 검사 결과: ${keywordLevel}`)

    // 5. 위기 2차 검사 (nano 분류, 키워드가 none일 때만)
    let classificationLevel: 'none' | 'medium' | 'high' = 'none'

    if (keywordLevel === 'none') {
      console.log('[chat] nano 분류 시작')
      const { recentMessages } = await buildContext(supabaseClient, user.id, conversationId)
      classificationLevel = await classifyRisk(message, recentMessages)
    } else {
      console.log('[chat] 키워드 위기 감지, nano 분류 건너뜀')
    }

    // 최종 위기 레벨
    const riskLevel = keywordLevel === 'high' || classificationLevel === 'high'
      ? 'high'
      : keywordLevel === 'medium' || classificationLevel === 'medium'
      ? 'medium'
      : 'none'

    console.log(`[chat] 최종 위기 레벨: ${riskLevel}`)

    // 6. 위기 처리
    if (riskLevel !== 'none') {
      console.log('[chat] 위기 감지, crisis 응답 반환')

      // risk_events 기록 (원문 없음)
      const source = keywordLevel !== 'none' && classificationLevel !== 'none'
        ? 'both'
        : keywordLevel !== 'none'
        ? 'keyword'
        : 'classifier'

      await supabaseClient.from('risk_events').insert({
        user_id: user.id,
        conversation_id: conversationId,
        level: riskLevel,
        source,
      })

      return new Response(
        JSON.stringify({ type: 'crisis' } as ChatResponse),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. 정상 대화 처리
    console.log('[chat] 정상 대화 처리')

    // 사용자 메시지 저장
    await supabaseClient.from('messages').insert({
      user_id: user.id,
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // 컨텍스트 구성
    const { petContext, recentJournals, recentMessages } = await buildContext(
      supabaseClient,
      user.id,
      conversationId
    )

    const systemPrompt = buildChatSystemPrompt(petContext, recentJournals)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    // OpenAI 스트리밍 호출
    const model = Deno.env.get('OPENAI_MODEL_CHAT') || 'gpt-4o-mini'
    const stream = await callOpenAIStream({
      model,
      messages,
      maxTokens: 300,
    })

    // 스트림을 읽으면서 응답을 수집 (저장용)
    let assistantMessage = ''
    const reader = stream.getReader()
    const encoder = new TextEncoder()

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              // 응답 완료, 메시지 저장
              await supabaseClient.from('messages').insert({
                user_id: user.id,
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantMessage,
              })

              // usage 로깅 (간단히 추정)
              await logUsage({
                userId: user.id,
                purpose: 'chat',
                model,
                inputTokens: 0, // 스트리밍에서는 정확한 값 없음
                cachedTokens: 0,
                outputTokens: Math.ceil(assistantMessage.length / 4), // 대략 추정
              })

              controller.close()
              break
            }

            assistantMessage += value

            // SSE 형식으로 전송
            const sseData = `data: ${JSON.stringify({ content: value })}\n\n`
            controller.enqueue(encoder.encode(sseData))
          }
        } catch (error) {
          console.error('[chat] 스트리밍 오류:', error)
          controller.error(error)
        }
      },
    })

    return new Response(responseStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[chat] 오류:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
